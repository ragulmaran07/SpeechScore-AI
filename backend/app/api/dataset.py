import csv
import io
import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from app.database import get_db
from app.schemas import (
    DatasetAnnotationCreate,
    DatasetAnnotationUpdate,
    DatasetAnnotationResponse
)

router = APIRouter(prefix="/api/dataset", tags=["dataset"])

@router.get("", response_model=List[DatasetAnnotationResponse])
def get_dataset(
    split: Optional[str] = Query(None, description="Filter by train, validation, or test"),
    delivery_label: Optional[str] = Query(None, description="Filter by delivery quality"),
    flaw_category: Optional[str] = Query(None, description="Filter by flaw category"),
    search: Optional[str] = Query(None, description="Search speech title or notes")
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM dataset_annotations WHERE 1=1"
        params = []
        
        if split:
            query += " AND split = ?"
            params.append(split)
        if delivery_label:
            query += " AND delivery_label = ?"
            params.append(delivery_label)
        if flaw_category:
            query += " AND flaw_category = ?"
            params.append(flaw_category)
        if search:
            query += " AND (speech_title LIKE ? OR notes LIKE ? OR transcript LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
            
        query += " ORDER BY created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.post("", response_model=DatasetAnnotationResponse)
def create_annotation(payload: DatasetAnnotationCreate):
    ann_id = f"ann-{uuid.uuid4().hex[:8]}"
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Check split leakage prevention: if another annotation for same speech_title exists, sync split
        cursor.execute("SELECT split FROM dataset_annotations WHERE speech_title = ? LIMIT 1", (payload.speech_title,))
        existing_split_row = cursor.fetchone()
        assigned_split = existing_split_row["split"] if existing_split_row else payload.split

        cursor.execute("""
            INSERT INTO dataset_annotations (
                id, recording_id, speech_title, transcript, delivery_label,
                flaw_category, start_time, end_time, severity, split,
                speaker_id, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ann_id,
            payload.recording_id,
            payload.speech_title,
            payload.transcript,
            payload.delivery_label,
            payload.flaw_category or "Normal Delivery",
            payload.start_time,
            payload.end_time,
            payload.severity,
            assigned_split,
            payload.speaker_id,
            payload.notes
        ))
        
        cursor.execute("SELECT * FROM dataset_annotations WHERE id = ?", (ann_id,))
        return dict(cursor.fetchone())

@router.put("/{annotation_id}", response_model=DatasetAnnotationResponse)
def update_annotation(annotation_id: str, payload: DatasetAnnotationUpdate):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM dataset_annotations WHERE id = ?", (annotation_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Annotation not found")
            
        updates = []
        params = []
        for field, value in payload.model_dump(exclude_unset=True).items():
            updates.append(f"{field} = ?")
            params.append(value)
            
        if not updates:
            return dict(existing)
            
        params.append(annotation_id)
        cursor.execute(f"UPDATE dataset_annotations SET {', '.join(updates)} WHERE id = ?", params)
        
        cursor.execute("SELECT * FROM dataset_annotations WHERE id = ?", (annotation_id,))
        return dict(cursor.fetchone())

@router.delete("/{annotation_id}")
def delete_annotation(annotation_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dataset_annotations WHERE id = ?", (annotation_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Annotation not found")
        return {"status": "success", "deleted_id": annotation_id}

@router.get("/export/csv")
def export_dataset_csv():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM dataset_annotations ORDER BY created_at DESC")
        rows = cursor.fetchall()
        
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "recording_id", "speech_title", "transcript", "delivery_label",
        "flaw_category", "start_time", "end_time", "severity", "split",
        "speaker_id", "notes", "created_at"
    ])
    for r in rows:
        writer.writerow([
            r["id"], r["recording_id"], r["speech_title"], r["transcript"],
            r["delivery_label"], r["flaw_category"], r["start_time"],
            r["end_time"], r["severity"], r["split"], r["speaker_id"],
            r["notes"], r["created_at"]
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=echojudge_contrastive_dataset.csv"}
    )

@router.get("/export/json")
def export_dataset_json():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM dataset_annotations ORDER BY created_at DESC")
        rows = [dict(r) for r in cursor.fetchall()]
        
    return StreamingResponse(
        iter([json.dumps(rows, indent=2)]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=echojudge_contrastive_dataset.json"}
    )

@router.post("/import/json")
async def import_dataset_json(file: UploadFile = File(...)):
    content = await file.read()
    try:
        items = json.loads(content.decode("utf-8"))
        if not isinstance(items, list):
            raise ValueError("Expected a list of annotation items.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")

    inserted = 0
    with get_db() as conn:
        cursor = conn.cursor()
        for item in items:
            ann_id = item.get("id") or f"ann-{uuid.uuid4().hex[:8]}"
            cursor.execute("""
                INSERT OR REPLACE INTO dataset_annotations (
                    id, recording_id, speech_title, transcript, delivery_label,
                    flaw_category, start_time, end_time, severity, split,
                    speaker_id, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                ann_id,
                item.get("recording_id"),
                item.get("speech_title", "Imported Speech"),
                item.get("transcript", ""),
                item.get("delivery_label", "Moderately Flawed"),
                item.get("flaw_category", "Pacing"),
                float(item.get("start_time", 0.0)),
                float(item.get("end_time", 0.0)),
                item.get("severity", "Moderate"),
                item.get("split", "train"),
                item.get("speaker_id", "Anonymous"),
                item.get("notes", "")
            ))
            inserted += 1

    return {"status": "success", "imported_count": inserted}
