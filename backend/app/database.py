import sqlite3
import json
from contextlib import contextmanager
from typing import Generator
from app.config import settings

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(settings.DATABASE_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

@contextmanager
def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Recordings
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS recordings (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            speaker_id TEXT,
            transcript TEXT NOT NULL,
            audio_path TEXT NOT NULL,
            duration REAL NOT NULL,
            sample_rate INTEGER NOT NULL,
            source_notes TEXT,
            consent_or_permission_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 2. Dataset Annotations (Contrastive dataset lab)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS dataset_annotations (
            id TEXT PRIMARY KEY,
            recording_id TEXT,
            speech_title TEXT NOT NULL,
            transcript TEXT,
            delivery_label TEXT NOT NULL, -- Ideal, Slightly Flawed, Moderately Flawed, Severely Flawed
            flaw_category TEXT,           -- Excessive speaking rate, Flat pitch, Sudden loudness changes, etc.
            start_time REAL NOT NULL,
            end_time REAL NOT NULL,
            severity TEXT NOT NULL,       -- Minor, Moderate, Major, Critical
            split TEXT NOT NULL DEFAULT 'train', -- train, validation, test
            speaker_id TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE SET NULL
        );
        """)

        # 3. Rubrics
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS rubrics (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            is_default INTEGER DEFAULT 0,
            weights_json TEXT NOT NULL,
            thresholds_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 4. Evaluations
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS evaluations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            participant_id TEXT NOT NULL,
            category TEXT NOT NULL,
            reference_recording_id TEXT NOT NULL,
            participant_recording_id TEXT NOT NULL,
            transcript TEXT NOT NULL,
            rubric_id TEXT,
            status TEXT NOT NULL DEFAULT 'completed', -- pending, processing, completed, failed
            overall_score REAL,
            category_scores_json TEXT,
            strengths_json TEXT,
            improvements_json TEXT,
            notes TEXT,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reference_recording_id) REFERENCES recordings(id),
            FOREIGN KEY (participant_recording_id) REFERENCES recordings(id),
            FOREIGN KEY (rubric_id) REFERENCES rubrics(id)
        );
        """)

        # 5. Detected Issues (Temporally grounded flaws)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS detected_issues (
            id TEXT PRIMARY KEY,
            evaluation_id TEXT NOT NULL,
            start_time REAL NOT NULL,
            end_time REAL NOT NULL,
            category TEXT NOT NULL,
            severity TEXT NOT NULL,
            measured_value REAL NOT NULL,
            reference_value REAL NOT NULL,
            deviation REAL NOT NULL,
            explanation TEXT NOT NULL,
            recommendation TEXT NOT NULL,
            confidence_or_quality REAL DEFAULT 1.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE
        );
        """)

        # Seed default rubric if none exists
        cursor.execute("SELECT COUNT(*) as cnt FROM rubrics")
        if cursor.fetchone()["cnt"] == 0:
            default_weights = {
                "pacing": 25.0,
                "pauses": 20.0,
                "pitch_variation": 20.0,
                "loudness_consistency": 15.0,
                "spectral_clarity": 10.0,
                "rhetorical_emphasis": 10.0
            }
            default_thresholds = {
                "pacing_tolerance_pct": 25.0,
                "excessive_pause_sec": 1.8,
                "min_pause_sec": 0.35,
                "pitch_range_tolerance_hz": 40.0,
                "energy_burst_tolerance_db": 10.0
            }
            cursor.execute("""
            INSERT INTO rubrics (id, name, is_default, weights_json, thresholds_json)
            VALUES (?, ?, ?, ?, ?)
            """, (
                "default-collegiate-rubric",
                "Collegiate Oratory & Declamation Standard (Official)",
                1,
                json.dumps(default_weights),
                json.dumps(default_thresholds)
            ))
