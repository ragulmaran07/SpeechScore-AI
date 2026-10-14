import shutil
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from app.config import settings
from app.database import get_db
from app.schemas import RecordingResponse
from app.services.audio_preprocessing import load_and_preprocess_audio, AudioPreprocessingError

router = APIRouter(prefix="/api/recordings", tags=["recordings"])

@router.get("", response_model=List[RecordingResponse])
def list_recordings():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recordings ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

@router.get("/{recording_id}", response_model=RecordingResponse)
def get_recording(recording_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recordings WHERE id = ?", (recording_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Recording not found")
        return dict(row)

@router.get("/{recording_id}/audio")
def get_recording_audio(recording_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT audio_path FROM recordings WHERE id = ?", (recording_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Recording not found")
        audio_path = Path(row["audio_path"])
        if not audio_path.exists():
            raise HTTPException(status_code=404, detail="Audio file on disk not found")
        
        media_type = "audio/wav"
        if audio_path.suffix.lower() in [".mp4", ".m4v"]:
            media_type = "video/mp4"
        elif audio_path.suffix.lower() == ".m4a":
            media_type = "audio/mp4"
        elif audio_path.suffix.lower() == ".mp3":
            media_type = "audio/mpeg"
        elif audio_path.suffix.lower() == ".ogg":
            media_type = "audio/ogg"
            
        return FileResponse(str(audio_path), media_type=media_type)

@router.post("/upload", response_model=RecordingResponse)
async def upload_recording(
    file: UploadFile = File(...),
    title: str = Form(...),
    speaker_id: Optional[str] = Form("Anonymous"),
    transcript: str = Form(...),
    source_notes: Optional[str] = Form(""),
    consent_or_permission_notes: Optional[str] = Form("Hackathon participant authorized")
):
    # Validate extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in [".wav", ".mp3", ".ogg", ".flac", ".mp4", ".m4a", ".mov", ".m4v"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported media format '{file_ext}'. Supported formats: MP4, WAV, FLAC, OGG, M4A, MP3."
        )

    # Save to disk
    rec_id = f"rec-{uuid.uuid4().hex[:10]}"
    safe_filename = f"{rec_id}_{Path(file.filename).name}"
    save_path = settings.UPLOAD_DIR / safe_filename

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Audio preprocessing & verification
        _, sr, duration, meta = load_and_preprocess_audio(str(save_path))
    except AudioPreprocessingError as ape:
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=400, detail=str(ape))
    except Exception as e:
        if save_path.exists():
            save_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to process audio file: {str(e)}")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO recordings (id, title, speaker_id, transcript, audio_path, duration, sample_rate, source_notes, consent_or_permission_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rec_id,
            title,
            speaker_id,
            transcript,
            str(save_path),
            duration,
            sr,
            source_notes,
            consent_or_permission_notes
        ))
        
        cursor.execute("SELECT * FROM recordings WHERE id = ?", (rec_id,))
        new_row = cursor.fetchone()
        return dict(new_row)
