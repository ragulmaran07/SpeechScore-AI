from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# ----------------- Recording Schemas -----------------
class RecordingBase(BaseModel):
    title: str
    speaker_id: Optional[str] = "Anonymous"
    transcript: str
    source_notes: Optional[str] = None
    consent_or_permission_notes: Optional[str] = "Educational hackathon research / Fair use"

class RecordingResponse(RecordingBase):
    id: str
    audio_path: str
    duration: float
    sample_rate: int
    created_at: str

# ----------------- Dataset Annotation Schemas -----------------
class DatasetAnnotationCreate(BaseModel):
    recording_id: Optional[str] = None
    speech_title: str
    transcript: Optional[str] = ""
    delivery_label: str = Field(..., description="Ideal, Slightly Flawed, Moderately Flawed, Severely Flawed")
    flaw_category: Optional[str] = "Normal Delivery"
    start_time: float
    end_time: float
    severity: str = Field(..., description="Minor, Moderate, Major, Critical")
    split: str = Field("train", description="train, validation, test")
    speaker_id: Optional[str] = "Speaker-01"
    notes: Optional[str] = ""

class DatasetAnnotationUpdate(BaseModel):
    speech_title: Optional[str] = None
    transcript: Optional[str] = None
    delivery_label: Optional[str] = None
    flaw_category: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    severity: Optional[str] = None
    split: Optional[str] = None
    speaker_id: Optional[str] = None
    notes: Optional[str] = None

class DatasetAnnotationResponse(DatasetAnnotationCreate):
    id: str
    created_at: str

# ----------------- Rubric Schemas -----------------
class RubricWeights(BaseModel):
    pacing: float = 25.0
    pauses: float = 20.0
    pitch_variation: float = 20.0
    loudness_consistency: float = 15.0
    spectral_clarity: float = 10.0
    rhetorical_emphasis: float = 10.0

class RubricThresholds(BaseModel):
    pacing_tolerance_pct: float = 25.0
    excessive_pause_sec: float = 1.8
    min_pause_sec: float = 0.35
    pitch_range_tolerance_hz: float = 40.0
    energy_burst_tolerance_db: float = 10.0

class RubricCreate(BaseModel):
    name: str
    is_default: bool = False
    weights: RubricWeights
    thresholds: RubricThresholds

class RubricResponse(BaseModel):
    id: str
    name: str
    is_default: bool
    weights: Dict[str, float]
    thresholds: Dict[str, float]
    created_at: str

# ----------------- Detected Issue Schemas -----------------
class DetectedIssueResponse(BaseModel):
    id: str
    evaluation_id: str
    start_time: float
    end_time: float
    category: str
    severity: str
    measured_value: float
    reference_value: float
    deviation: float
    explanation: str
    recommendation: str
    confidence_or_quality: float = 1.0

# ----------------- Evaluation Schemas -----------------
class EvaluationCreate(BaseModel):
    title: str
    participant_id: str
    category: str
    transcript: str
    reference_recording_id: Optional[str] = None
    participant_recording_id: Optional[str] = None
    rubric_id: Optional[str] = "default-collegiate-rubric"
    notes: Optional[str] = None

class EvaluationResponse(BaseModel):
    id: str
    title: str
    participant_id: str
    category: str
    transcript: str
    reference_recording_id: str
    participant_recording_id: str
    rubric_id: Optional[str]
    status: str
    overall_score: Optional[float]
    category_scores: Optional[Dict[str, float]] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    notes: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str

class TimeSeriesPoint(BaseModel):
    time: float
    reference: Optional[float] = None
    participant: Optional[float] = None

class FeatureSummary(BaseModel):
    duration: float
    speech_rate_wpm: float
    articulation_rate_wpm: float
    pause_count: int
    total_pause_duration_sec: float
    average_pause_sec: float
    median_f0_hz: float
    f0_std_hz: float
    f0_range_hz: float
    rms_energy_mean: float
    rms_energy_std: float
    spectral_centroid_mean: float

class EvaluationDetailResponse(BaseModel):
    evaluation: EvaluationResponse
    reference_recording: RecordingResponse
    participant_recording: RecordingResponse
    rubric: RubricResponse
    issues: List[DetectedIssueResponse]
    feature_summaries: Dict[str, FeatureSummary]
    pitch_series: List[Dict[str, Any]]
    energy_series: List[Dict[str, Any]]
    speech_rate_windows: List[Dict[str, Any]]
    pause_intervals: Dict[str, List[Dict[str, float]]]
    mfcc_comparison: Dict[str, Any]
