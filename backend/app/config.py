import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DATABASE_PATH: Path = BASE_DIR / "echojudge.db"
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    FEATURES_DIR: Path = BASE_DIR / "data" / "features"
    REPORTS_DIR: Path = BASE_DIR / "data" / "reports"
    
    # Audio signal processing defaults
    DEFAULT_SAMPLE_RATE: int = 16000
    N_FFT: int = 2048
    HOP_LENGTH: int = 512
    N_MFCC: int = 13
    
    # Default Flaw Detection Tolerances
    MAX_PACING_DEVIATION_PCT: float = 30.0  # % higher or lower speech rate
    MIN_PAUSE_DURATION_SEC: float = 0.35    # minimum pause length in sec
    EXCESSIVE_PAUSE_DURATION_SEC: float = 1.8 # silence flagged as hesitation/awkward pause
    ENERGY_BURST_THRESHOLD_DB: float = 12.0  # abrupt RMS energy burst
    PITCH_STABILITY_TOLERANCE_HZ: float = 35.0 # Hz range under which delivery is flagged as monotone/flat
    
    # Optional Gemini AI Coaching
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.FEATURES_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
