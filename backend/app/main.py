import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db
from app.services.sample_data import seed_sample_evaluation_if_empty
from app.api import recordings, dataset, rubrics, evaluations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed baseline demo fixtures
    init_db()
    seed_sample_evaluation_if_empty()
    yield

app = FastAPI(
    title="EchoJudge AI API",
    description="Explainable Speech Performance Evaluator using Audio Signal Processing",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(recordings.router)
app.include_router(dataset.router)
app.include_router(rubrics.router)
app.include_router(evaluations.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "EchoJudge AI Core",
        "version": "1.0.0",
        "sample_rate": settings.DEFAULT_SAMPLE_RATE,
        "gemini_enabled": bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5)
    }

@app.get("/api/settings")
def get_system_settings():
    """
    Returns public non-sensitive configuration parameters for settings page.
    """
    return {
        "sample_rate": settings.DEFAULT_SAMPLE_RATE,
        "n_fft": settings.N_FFT,
        "hop_length": settings.HOP_LENGTH,
        "n_mfcc": settings.N_MFCC,
        "pacing_tolerance_pct": settings.MAX_PACING_DEVIATION_PCT,
        "excessive_pause_threshold_sec": settings.EXCESSIVE_PAUSE_DURATION_SEC,
        "min_pause_sec": settings.MIN_PAUSE_DURATION_SEC,
        "pitch_tolerance_hz": settings.PITCH_STABILITY_TOLERANCE_HZ,
        "energy_burst_threshold_db": settings.ENERGY_BURST_THRESHOLD_DB,
        "gemini_configured": bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 5),
        "gemini_model": settings.GEMINI_MODEL,
        "database_file": str(settings.DATABASE_PATH.name),
        "storage_uploads_dir": str(settings.UPLOAD_DIR)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
