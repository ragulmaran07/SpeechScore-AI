import json
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.schemas import RubricResponse, RubricCreate

router = APIRouter(prefix="/api/rubrics", tags=["rubrics"])

@router.get("", response_model=List[RubricResponse])
def list_rubrics():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rubrics ORDER BY is_default DESC, created_at DESC")
        rows = cursor.fetchall()
        result = []
        for r in rows:
            result.append(RubricResponse(
                id=r["id"],
                name=r["name"],
                is_default=bool(r["is_default"]),
                weights=json.loads(r["weights_json"]),
                thresholds=json.loads(r["thresholds_json"]),
                created_at=str(r["created_at"])
            ))
        return result

@router.get("/{rubric_id}", response_model=RubricResponse)
def get_rubric(rubric_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM rubrics WHERE id = ?", (rubric_id,))
        r = cursor.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Rubric not found")
        return RubricResponse(
            id=r["id"],
            name=r["name"],
            is_default=bool(r["is_default"]),
            weights=json.loads(r["weights_json"]),
            thresholds=json.loads(r["thresholds_json"]),
            created_at=str(r["created_at"])
        )

@router.put("/{rubric_id}", response_model=RubricResponse)
def update_rubric(rubric_id: str, payload: RubricCreate):
    weights_dict = payload.weights.model_dump()
    thresholds_dict = payload.thresholds.model_dump()
    
    # Validate weights are non-negative and sum to 100
    for k, v in weights_dict.items():
        if v < 0:
            raise HTTPException(status_code=400, detail=f"Weight '{k}' cannot be negative.")
            
    total_w = sum(weights_dict.values())
    if abs(total_w - 100.0) > 0.5:
        raise HTTPException(
            status_code=400,
            detail=f"Rubric category weights must sum to 100%. Current sum: {total_w:.1f}%"
        )
        
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM rubrics WHERE id = ?", (rubric_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Rubric not found")
            
        cursor.execute("""
            UPDATE rubrics 
            SET name = ?, weights_json = ?, thresholds_json = ?, is_default = ?
            WHERE id = ?
        """, (
            payload.name,
            json.dumps(weights_dict),
            json.dumps(thresholds_dict),
            1 if payload.is_default else 0,
            rubric_id
        ))
        
        cursor.execute("SELECT * FROM rubrics WHERE id = ?", (rubric_id,))
        r = cursor.fetchone()
        return RubricResponse(
            id=r["id"],
            name=r["name"],
            is_default=bool(r["is_default"]),
            weights=json.loads(r["weights_json"]),
            thresholds=json.loads(r["thresholds_json"]),
            created_at=str(r["created_at"])
        )
