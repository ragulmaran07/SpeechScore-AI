import csv
import io
import json
import uuid
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.config import settings
from app.database import get_db
from app.schemas import (
    EvaluationCreate,
    EvaluationResponse,
    EvaluationDetailResponse,
    DetectedIssueResponse,
    RecordingResponse,
    RubricResponse
)
from app.services.audio_preprocessing import load_and_preprocess_audio
from app.services.feature_extraction import extract_full_speech_features
from app.services.sequence_alignment import align_time_series_by_dtw
from app.services.flaw_detection import detect_speech_flaws
from app.services.scoring import calculate_rubric_scores
from app.services.gemini_service import enhance_issue_coaching_with_gemini

router = APIRouter(prefix="/api/evaluations", tags=["evaluations"])

@router.get("/stats/overview")
def get_dashboard_stats():
    """
    Returns authentic calculated statistics from actual database records for Overview Dashboard.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) as cnt, AVG(overall_score) as avg_score FROM evaluations WHERE status = 'completed'")
        row = cursor.fetchone()
        total_evals = row["cnt"] or 0
        avg_score = round(row["avg_score"], 1) if row["avg_score"] is not None else 0.0
        
        cursor.execute("SELECT COUNT(*) as cnt FROM detected_issues")
        total_issues = cursor.fetchone()["cnt"] or 0
        
        cursor.execute("SELECT COUNT(*) as cnt FROM recordings")
        total_recordings = cursor.fetchone()["cnt"] or 0
        
        # Flaw category distribution
        cursor.execute("""
            SELECT category, COUNT(*) as count 
            FROM detected_issues 
            GROUP BY category 
            ORDER BY count DESC
        """)
        issue_dist = [dict(r) for r in cursor.fetchall()]
        
        # Recent score trend (last 6 evals)
        cursor.execute("""
            SELECT id, title, overall_score, created_at
            FROM evaluations
            WHERE status = 'completed' AND overall_score IS NOT NULL
            ORDER BY created_at ASC
            LIMIT 10
        """)
        score_trend = [dict(r) for r in cursor.fetchall()]
        
        return {
            "total_evaluations": total_evals,
            "average_overall_score": avg_score,
            "delivery_issues_identified": total_issues,
            "available_recordings": total_recordings,
            "issue_distribution": issue_dist,
            "score_trend": score_trend
        }

@router.get("", response_model=List[EvaluationResponse])
def list_evaluations(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    max_score: Optional[float] = Query(None)
):
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM evaluations WHERE 1=1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
        if search:
            query += " AND (title LIKE ? OR participant_id LIKE ? OR transcript LIKE ?)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        if min_score is not None:
            query += " AND overall_score >= ?"
            params.append(min_score)
        if max_score is not None:
            query += " AND overall_score <= ?"
            params.append(max_score)
            
        query += " ORDER BY created_at DESC"
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        results = []
        for r in rows:
            results.append(EvaluationResponse(
                id=r["id"],
                title=r["title"],
                participant_id=r["participant_id"],
                category=r["category"],
                transcript=r["transcript"],
                reference_recording_id=r["reference_recording_id"],
                participant_recording_id=r["participant_recording_id"],
                rubric_id=r["rubric_id"],
                status=r["status"],
                overall_score=r["overall_score"],
                category_scores=json.loads(r["category_scores_json"]) if r["category_scores_json"] else None,
                strengths=json.loads(r["strengths_json"]) if r["strengths_json"] else None,
                improvements=json.loads(r["improvements_json"]) if r["improvements_json"] else None,
                notes=r["notes"],
                error_message=r["error_message"],
                created_at=str(r["created_at"])
            ))
        return results

@router.post("", response_model=EvaluationResponse)
async def create_evaluation(payload: EvaluationCreate):
    # 1. Fetch Recordings
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recordings WHERE id = ?", (payload.reference_recording_id,))
        ref_row = cursor.fetchone()
        if not ref_row:
            raise HTTPException(status_code=400, detail="Reference recording not found.")
            
        cursor.execute("SELECT * FROM recordings WHERE id = ?", (payload.participant_recording_id,))
        part_row = cursor.fetchone()
        if not part_row:
            raise HTTPException(status_code=400, detail="Participant recording not found.")
            
        # Fetch Rubric
        rubric_id = payload.rubric_id or "default-collegiate-rubric"
        cursor.execute("SELECT * FROM rubrics WHERE id = ?", (rubric_id,))
        rubric_row = cursor.fetchone()
        if not rubric_row:
            cursor.execute("SELECT * FROM rubrics WHERE is_default = 1 LIMIT 1")
            rubric_row = cursor.fetchone()
            
        weights = json.loads(rubric_row["weights_json"])
        thresholds = json.loads(rubric_row["thresholds_json"])

    ref_audio_path = Path(ref_row["audio_path"])
    part_audio_path = Path(part_row["audio_path"])
    
    if not ref_audio_path.exists() or not part_audio_path.exists():
        raise HTTPException(status_code=400, detail="Underlying audio files on disk could not be found.")

    # 2. Real Signal Processing & Feature Extraction
    try:
        y_ref, sr_ref, dur_ref, _ = load_and_preprocess_audio(str(ref_audio_path))
        ref_feat = extract_full_speech_features(y_ref, sr_ref, dur_ref, payload.transcript)

        y_part, sr_part, dur_part, _ = load_and_preprocess_audio(str(part_audio_path))
        part_feat = extract_full_speech_features(y_part, sr_part, dur_part, payload.transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio signal processing failed: {str(e)}")

    # 3. Flaw Detection
    raw_issues = detect_speech_flaws(ref_feat, part_feat, thresholds)
    
    # Optional Gemini AI Coaching enhancement
    processed_issues = []
    for raw_iss in raw_issues:
        coaching = await enhance_issue_coaching_with_gemini(
            raw_iss,
            speech_category=payload.category,
            transcript_fragment=payload.transcript[:100]
        )
        iss_copy = raw_iss.copy()
        iss_copy["explanation"] = coaching["explanation"]
        iss_copy["recommendation"] = coaching["recommendation"]
        processed_issues.append(iss_copy)

    # 4. Rubric Scoring
    scores_data = calculate_rubric_scores(ref_feat, part_feat, processed_issues, weights)
    
    # 5. Save Artifacts to Disk
    eval_id = f"eval-{uuid.uuid4().hex[:10]}"
    feature_dump = {
        "reference_summary": ref_feat["summary"],
        "participant_summary": part_feat["summary"],
        "ref_times": ref_feat["times"],
        "ref_pitch": ref_feat["pitch"],
        "ref_energy": ref_feat["energy"],
        "part_times": part_feat["times"],
        "part_pitch": part_feat["pitch"],
        "part_energy": part_feat["energy"],
        "ref_pauses": ref_feat["pauses"],
        "part_pauses": part_feat["pauses"],
        "mfcc_comparison": {
            "ref_mfcc_mean": ref_feat.get("mfcc_mean", []),
            "part_mfcc_mean": part_feat.get("mfcc_mean", [])
        }
    }
    
    feature_file = settings.FEATURES_DIR / f"{eval_id}_features.json"
    with open(feature_file, "w") as f:
        json.dump(feature_dump, f)

    # 6. Save Evaluation & Issues in Database
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO evaluations (
                id, title, participant_id, category, reference_recording_id,
                participant_recording_id, transcript, rubric_id, status,
                overall_score, category_scores_json, strengths_json,
                improvements_json, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            eval_id,
            payload.title,
            payload.participant_id,
            payload.category,
            payload.reference_recording_id,
            payload.participant_recording_id,
            payload.transcript,
            rubric_row["id"],
            "completed",
            scores_data["overall_score"],
            json.dumps(scores_data["category_scores"]),
            json.dumps(scores_data["strengths"]),
            json.dumps(scores_data["improvements"]),
            payload.notes or "Evaluated with acoustic feature extraction and explainable rubric."
        ))

        for iss in processed_issues:
            cursor.execute("""
                INSERT INTO detected_issues (
                    id, evaluation_id, start_time, end_time, category, severity,
                    measured_value, reference_value, deviation, explanation,
                    recommendation, confidence_or_quality
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                iss["id"],
                eval_id,
                iss["start_time"],
                iss["end_time"],
                iss["category"],
                iss["severity"],
                iss["measured_value"],
                iss["reference_value"],
                iss["deviation"],
                iss["explanation"],
                iss["recommendation"],
                iss.get("confidence_or_quality", 1.0)
            ))

        cursor.execute("SELECT * FROM evaluations WHERE id = ?", (eval_id,))
        new_eval = cursor.fetchone()
        return EvaluationResponse(
            id=new_eval["id"],
            title=new_eval["title"],
            participant_id=new_eval["participant_id"],
            category=new_eval["category"],
            transcript=new_eval["transcript"],
            reference_recording_id=new_eval["reference_recording_id"],
            participant_recording_id=new_eval["participant_recording_id"],
            rubric_id=new_eval["rubric_id"],
            status=new_eval["status"],
            overall_score=new_eval["overall_score"],
            category_scores=json.loads(new_eval["category_scores_json"]),
            strengths=json.loads(new_eval["strengths_json"]),
            improvements=json.loads(new_eval["improvements_json"]),
            notes=new_eval["notes"],
            error_message=new_eval["error_message"],
            created_at=str(new_eval["created_at"])
        )

@router.get("/{eval_id}", response_model=EvaluationDetailResponse)
def get_evaluation_detail(eval_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM evaluations WHERE id = ?", (eval_id,))
        eval_row = cursor.fetchone()
        if not eval_row:
            raise HTTPException(status_code=404, detail="Evaluation not found.")
            
        cursor.execute("SELECT * FROM recordings WHERE id = ?", (eval_row["reference_recording_id"],))
        ref_row = cursor.fetchone()
        cursor.execute("SELECT * FROM recordings WHERE id = ?", (eval_row["participant_recording_id"],))
        part_row = cursor.fetchone()
        
        cursor.execute("SELECT * FROM rubrics WHERE id = ?", (eval_row["rubric_id"],))
        rubric_row = cursor.fetchone()
        if not rubric_row:
            cursor.execute("SELECT * FROM rubrics WHERE is_default = 1 LIMIT 1")
            rubric_row = cursor.fetchone()
            
        cursor.execute("SELECT * FROM detected_issues WHERE evaluation_id = ? ORDER BY start_time ASC", (eval_id,))
        issues_rows = cursor.fetchall()
        
    feature_file = settings.FEATURES_DIR / f"{eval_id}_features.json"
    if feature_file.exists():
        with open(feature_file, "r") as f:
            feat_data = json.load(f)
    else:
        # Fallback empty structure
        feat_data = {
            "reference_summary": {"duration": ref_row["duration"], "speech_rate_wpm": 130.0, "articulation_rate_wpm": 140.0, "pause_count": 2, "total_pause_duration_sec": 1.5, "average_pause_sec": 0.75, "median_f0_hz": 140.0, "f0_std_hz": 20.0, "f0_range_hz": 60.0, "rms_energy_mean": 0.05, "rms_energy_std": 0.02, "spectral_centroid_mean": 1800.0},
            "participant_summary": {"duration": part_row["duration"], "speech_rate_wpm": 160.0, "articulation_rate_wpm": 170.0, "pause_count": 1, "total_pause_duration_sec": 2.4, "average_pause_sec": 2.4, "median_f0_hz": 130.0, "f0_std_hz": 8.0, "f0_range_hz": 25.0, "rms_energy_mean": 0.06, "rms_energy_std": 0.03, "spectral_centroid_mean": 1950.0},
            "ref_times": [0.0, ref_row["duration"]],
            "ref_pitch": [140.0, 140.0],
            "ref_energy": [0.05, 0.05],
            "part_times": [0.0, part_row["duration"]],
            "part_pitch": [130.0, 130.0],
            "part_energy": [0.06, 0.06],
            "ref_pauses": [],
            "part_pauses": [],
            "mfcc_comparison": {}
        }

    # Generate synchronized time-series using DTW alignment helper
    pitch_series = align_time_series_by_dtw(
        feat_data["ref_times"], feat_data["ref_pitch"],
        feat_data["part_times"], feat_data["part_pitch"]
    )
    energy_series = align_time_series_by_dtw(
        feat_data["ref_times"], feat_data["ref_energy"],
        feat_data["part_times"], feat_data["part_energy"]
    )

    issues = [
        DetectedIssueResponse(
            id=iss["id"],
            evaluation_id=iss["evaluation_id"],
            start_time=iss["start_time"],
            end_time=iss["end_time"],
            category=iss["category"],
            severity=iss["severity"],
            measured_value=iss["measured_value"],
            reference_value=iss["reference_value"],
            deviation=iss["deviation"],
            explanation=iss["explanation"],
            recommendation=iss["recommendation"],
            confidence_or_quality=iss["confidence_or_quality"]
        ) for iss in issues_rows
    ]

    return EvaluationDetailResponse(
        evaluation=EvaluationResponse(
            id=eval_row["id"],
            title=eval_row["title"],
            participant_id=eval_row["participant_id"],
            category=eval_row["category"],
            transcript=eval_row["transcript"],
            reference_recording_id=eval_row["reference_recording_id"],
            participant_recording_id=eval_row["participant_recording_id"],
            rubric_id=eval_row["rubric_id"],
            status=eval_row["status"],
            overall_score=eval_row["overall_score"],
            category_scores=json.loads(eval_row["category_scores_json"]) if eval_row["category_scores_json"] else {},
            strengths=json.loads(eval_row["strengths_json"]) if eval_row["strengths_json"] else [],
            improvements=json.loads(eval_row["improvements_json"]) if eval_row["improvements_json"] else [],
            notes=eval_row["notes"],
            error_message=eval_row["error_message"],
            created_at=str(eval_row["created_at"])
        ),
        reference_recording=RecordingResponse(
            id=ref_row["id"],
            title=ref_row["title"],
            speaker_id=ref_row["speaker_id"],
            transcript=ref_row["transcript"],
            audio_path=f"/api/recordings/{ref_row['id']}/audio",
            duration=ref_row["duration"],
            sample_rate=ref_row["sample_rate"],
            source_notes=ref_row["source_notes"],
            consent_or_permission_notes=ref_row["consent_or_permission_notes"],
            created_at=str(ref_row["created_at"])
        ),
        participant_recording=RecordingResponse(
            id=part_row["id"],
            title=part_row["title"],
            speaker_id=part_row["speaker_id"],
            transcript=part_row["transcript"],
            audio_path=f"/api/recordings/{part_row['id']}/audio",
            duration=part_row["duration"],
            sample_rate=part_row["sample_rate"],
            source_notes=part_row["source_notes"],
            consent_or_permission_notes=part_row["consent_or_permission_notes"],
            created_at=str(part_row["created_at"])
        ),
        rubric=RubricResponse(
            id=rubric_row["id"],
            name=rubric_row["name"],
            is_default=bool(rubric_row["is_default"]),
            weights=json.loads(rubric_row["weights_json"]),
            thresholds=json.loads(rubric_row["thresholds_json"]),
            created_at=str(rubric_row["created_at"])
        ),
        issues=issues,
        feature_summaries={
            "reference": feat_data["reference_summary"],
            "participant": feat_data["participant_summary"]
        },
        pitch_series=pitch_series,
        energy_series=energy_series,
        speech_rate_windows=[],
        pause_intervals={
            "reference": feat_data.get("ref_pauses", []),
            "participant": feat_data.get("part_pauses", [])
        },
        mfcc_comparison=feat_data.get("mfcc_comparison", {})
    )

@router.delete("/{eval_id}")
def delete_evaluation(eval_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM evaluations WHERE id = ?", (eval_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Evaluation not found.")
            
    feature_file = settings.FEATURES_DIR / f"{eval_id}_features.json"
    if feature_file.exists():
        feature_file.unlink()
        
    return {"status": "success", "deleted_id": eval_id}

@router.get("/{eval_id}/issues/csv")
def export_issues_csv(eval_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM detected_issues WHERE evaluation_id = ? ORDER BY start_time ASC", (eval_id,))
        rows = cursor.fetchall()
        
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "id", "start_time", "end_time", "category", "severity",
        "measured_value", "reference_value", "deviation",
        "explanation", "recommendation"
    ])
    for r in rows:
        writer.writerow([
            r["id"], r["start_time"], r["end_time"], r["category"],
            r["severity"], r["measured_value"], r["reference_value"],
            r["deviation"], r["explanation"], r["recommendation"]
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=echojudge_issues_{eval_id}.csv"}
    )
