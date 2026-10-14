import os
import pytest
import numpy as np
from pathlib import Path

from app.services.audio_preprocessing import load_and_preprocess_audio, AudioPreprocessingError
from app.services.feature_extraction import (
    compute_rms_energy,
    estimate_f0,
    detect_pauses,
    compute_mfcc_and_spectral,
    extract_full_speech_features
)
from app.services.sequence_alignment import compute_dtw_alignment, align_time_series_by_dtw
from app.services.flaw_detection import detect_speech_flaws, merge_adjacent_intervals
from app.services.scoring import calculate_rubric_scores
from app.services.sample_data import generate_synthetic_speech_wave, save_wav_file

@pytest.fixture
def synthetic_wav_paths(tmp_path):
    ref_path = tmp_path / "test_ref.wav"
    part_path = tmp_path / "test_part.wav"
    
    # 3-second reference audio
    ref_audio = generate_synthetic_speech_wave(duration=3.0, base_f0=150.0, pitch_modulation=30.0)
    save_wav_file(ref_path, ref_audio)
    
    # 2.5-second participant audio with silence pause
    part_audio = generate_synthetic_speech_wave(
        duration=2.5,
        base_f0=120.0,
        pitch_modulation=10.0,
        pause_windows=[(1.0, 1.8)]
    )
    save_wav_file(part_path, part_audio)
    
    return ref_path, part_path

def test_audio_preprocessing_validation(synthetic_wav_paths):
    ref_path, _ = synthetic_wav_paths
    y, sr, duration, meta = load_and_preprocess_audio(str(ref_path), target_sr=16000)
    
    assert sr == 16000
    assert abs(duration - 3.0) < 0.1
    assert len(y) > 0
    assert meta["duration_seconds"] > 2.8

def test_feature_extraction_pitch_and_pauses(synthetic_wav_paths):
    _, part_path = synthetic_wav_paths
    y, sr, duration, _ = load_and_preprocess_audio(str(part_path))
    
    features = extract_full_speech_features(
        y=y,
        sr=sr,
        duration=duration,
        transcript="Testing collegiate speech evaluation platform"
    )
    
    summary = features["summary"]
    assert "speech_rate_wpm" in summary
    assert "median_f0_hz" in summary
    assert "f0_range_hz" in summary
    assert summary["pause_count"] >= 1
    assert len(features["times"]) > 0

def test_dtw_sequence_alignment():
    # Sequence A and B with slight temporal stretch
    seq_a = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
    seq_b = np.array([1.1, 2.0, 2.9, 3.8, 5.1])
    
    path, dist = compute_dtw_alignment(seq_a, seq_b)
    assert len(path) >= 5
    assert dist >= 0.0

def test_flaw_detection_and_merging(synthetic_wav_paths):
    ref_path, part_path = synthetic_wav_paths
    y_ref, sr_ref, dur_ref, _ = load_and_preprocess_audio(str(ref_path))
    y_part, sr_part, dur_part, _ = load_and_preprocess_audio(str(part_path))
    
    ref_feat = extract_full_speech_features(y_ref, sr_ref, dur_ref, "Collegiate Forensics")
    part_feat = extract_full_speech_features(y_part, sr_part, dur_part, "Collegiate Forensics")
    
    thresholds = {
        "pacing_tolerance_pct": 20.0,
        "excessive_pause_sec": 0.6,
        "min_pause_sec": 0.35,
        "pitch_range_tolerance_hz": 40.0,
        "energy_burst_tolerance_db": 10.0
    }
    
    issues = detect_speech_flaws(ref_feat, part_feat, thresholds)
    assert isinstance(issues, list)
    # Pause flaw should be detected because pause window was 0.8s > 0.6s
    assert any(iss["category"] == "Excessive Pause" for iss in issues)

def test_rubric_scoring_calculation():
    mock_summary = {
        "duration": 5.0,
        "speech_rate_wpm": 130.0,
        "pause_count": 1,
        "average_pause_sec": 0.7,
        "f0_range_hz": 50.0,
        "spectral_centroid_mean": 1800.0
    }
    ref_feat = {"summary": mock_summary}
    part_feat = {"summary": mock_summary}
    
    weights = {
        "pacing": 25.0,
        "pauses": 20.0,
        "pitch_variation": 20.0,
        "loudness_consistency": 15.0,
        "spectral_clarity": 10.0,
        "rhetorical_emphasis": 10.0
    }
    
    scores = calculate_rubric_scores(ref_feat, part_feat, [], weights)
    assert scores["overall_score"] >= 80.0
    assert len(scores["strengths"]) > 0
