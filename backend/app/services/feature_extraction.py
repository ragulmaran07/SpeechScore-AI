import numpy as np
import scipy.signal
from typing import Dict, Any, List, Tuple, Optional

try:
    import librosa
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

def compute_rms_energy(y: np.ndarray, frame_length: int = 1024, hop_length: int = 512) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes frame-level RMS energy and frame timestamps.
    """
    if len(y) < frame_length:
        y = np.pad(y, (0, frame_length - len(y)))
        
    num_frames = 1 + (len(y) - frame_length) // hop_length
    frames = np.lib.stride_tricks.as_strided(
        y,
        shape=(num_frames, frame_length),
        strides=(y.strides[0] * hop_length, y.strides[0])
    )
    rms = np.sqrt(np.mean(frames**2, axis=1) + 1e-12)
    return rms, np.arange(num_frames) * hop_length

def estimate_f0(
    y: np.ndarray,
    sr: int = 16000,
    hop_length: int = 512,
    fmin: float = 65.0,
    fmax: float = 450.0
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Estimates fundamental frequency (F0/pitch in Hz) over time.
    Uses librosa.yin/pyin if available, otherwise autocorrelation-based pitch tracking.
    Returns (f0_series, voiced_mask).
    """
    if HAS_LIBROSA:
        try:
            # Use YIN algorithm
            f0 = librosa.yin(y, fmin=fmin, fmax=fmax, sr=sr, hop_length=hop_length)
            # Voiced when f0 is within reasonable bounds and not at boundaries
            voiced = (f0 >= fmin * 1.05) & (f0 <= fmax * 0.95) & (~np.isnan(f0))
            f0_clean = np.where(voiced, f0, 0.0)
            return f0_clean.astype(np.float32), voiced
        except Exception:
            pass

    # Autocorrelation fallback for F0
    frame_length = 2048
    rms, _ = compute_rms_energy(y, frame_length, hop_length)
    energy_threshold = np.mean(rms) * 0.25
    
    num_frames = 1 + max(0, (len(y) - frame_length) // hop_length)
    f0_list = []
    voiced_list = []
    
    min_lag = int(sr / fmax)
    max_lag = int(sr / fmin)
    
    for i in range(num_frames):
        start = i * hop_length
        frame = y[start : start + frame_length]
        if len(frame) < frame_length:
            frame = np.pad(frame, (0, frame_length - len(frame)))
            
        frame_rms = np.sqrt(np.mean(frame**2) + 1e-12)
        if frame_rms < energy_threshold:
            f0_list.append(0.0)
            voiced_list.append(False)
            continue
            
        # Autocorrelation
        windowed = frame * np.hanning(len(frame))
        corr = scipy.signal.correlate(windowed, windowed, mode='full')
        corr = corr[len(corr)//2 :]
        
        search_region = corr[min_lag : min_lag + (max_lag - min_lag)]
        if len(search_region) == 0:
            f0_list.append(0.0)
            voiced_list.append(False)
            continue
            
        peak_idx = np.argmax(search_region) + min_lag
        peak_val = corr[peak_idx]
        
        # Voicing decision: peak must be substantial relative to zero-lag
        if peak_val > 0.3 * corr[0]:
            f0_list.append(float(sr / peak_idx))
            voiced_list.append(True)
        else:
            f0_list.append(0.0)
            voiced_list.append(False)
            
    return np.array(f0_list, dtype=np.float32), np.array(voiced_list, dtype=bool)

def compute_mfcc_and_spectral(
    y: np.ndarray,
    sr: int = 16000,
    n_mfcc: int = 13,
    hop_length: int = 512
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Computes MFCC matrix and spectral centroid.
    """
    if HAS_LIBROSA:
        try:
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc, hop_length=hop_length)
            centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop_length)[0]
            return mfcc.astype(np.float32), centroid.astype(np.float32)
        except Exception:
            pass

    # FFT-based spectral centroid & simplified filterbank fallback
    n_fft = 2048
    num_frames = 1 + max(0, (len(y) - n_fft) // hop_length)
    centroids = []
    
    freqs = np.fft.rfftfreq(n_fft, 1.0 / sr)
    window = np.hanning(n_fft)
    
    pseudo_mfcc = np.zeros((n_mfcc, num_frames), dtype=np.float32)
    
    for i in range(num_frames):
        start = i * hop_length
        frame = y[start : start + n_fft]
        if len(frame) < n_fft:
            frame = np.pad(frame, (0, n_fft - len(frame)))
            
        spec = np.abs(np.fft.rfft(frame * window)) + 1e-10
        # Centroid = sum(f * spec) / sum(spec)
        centroid = float(np.sum(freqs * spec) / np.sum(spec))
        centroids.append(centroid)
        
        # Approximate 13 energy bands
        band_edges = np.logspace(np.log10(100), np.log10(sr/2), n_mfcc + 1)
        for b in range(n_mfcc):
            idx_range = np.where((freqs >= band_edges[b]) & (freqs < band_edges[b+1]))[0]
            if len(idx_range) > 0:
                pseudo_mfcc[b, i] = np.log(np.mean(spec[idx_range]) + 1e-6)

    return pseudo_mfcc, np.array(centroids, dtype=np.float32)

def detect_pauses(
    rms_series: np.ndarray,
    sr: int = 16000,
    hop_length: int = 512,
    min_pause_sec: float = 0.35,
    silence_threshold_ratio: float = 0.20
) -> List[Dict[str, float]]:
    """
    Identifies pause intervals using frame energy thresholding.
    Returns list of dicts with 'start', 'end', 'duration'.
    """
    frame_duration = hop_length / float(sr)
    mean_rms = float(np.mean(rms_series))
    threshold = max(mean_rms * silence_threshold_ratio, 0.003)
    
    is_silent = rms_series < threshold
    pauses = []
    
    in_pause = False
    start_frame = 0
    
    for i, silent in enumerate(is_silent):
        if silent and not in_pause:
            in_pause = True
            start_frame = i
        elif not silent and in_pause:
            in_pause = False
            duration = (i - start_frame) * frame_duration
            if duration >= min_pause_sec:
                pauses.append({
                    "start": round(start_frame * frame_duration, 2),
                    "end": round(i * frame_duration, 2),
                    "duration": round(duration, 2)
                })
                
    if in_pause:
        duration = (len(is_silent) - start_frame) * frame_duration
        if duration >= min_pause_sec:
            pauses.append({
                "start": round(start_frame * frame_duration, 2),
                "end": round(len(is_silent) * frame_duration, 2),
                "duration": round(duration, 2)
            })
            
    return pauses

def extract_full_speech_features(
    y: np.ndarray,
    sr: int,
    duration: float,
    transcript: str,
    target_points: int = 80
) -> Dict[str, Any]:
    """
    Runs complete acoustic analysis and packages summaries and visual time-series.
    """
    hop_length = 512
    frame_duration = hop_length / float(sr)
    
    # 1. RMS Energy
    rms, _ = compute_rms_energy(y, frame_length=1024, hop_length=hop_length)
    
    # 2. Pitch / F0
    f0, voiced = estimate_f0(y, sr=sr, hop_length=hop_length)
    voiced_f0 = f0[voiced]
    
    if len(voiced_f0) > 5:
        median_f0 = float(np.median(voiced_f0))
        f0_std = float(np.std(voiced_f0))
        f0_min = float(np.percentile(voiced_f0, 5))
        f0_max = float(np.percentile(voiced_f0, 95))
        f0_range = float(f0_max - f0_min)
    else:
        median_f0 = 0.0
        f0_std = 0.0
        f0_range = 0.0
        
    # 3. Pauses
    pauses = detect_pauses(rms, sr=sr, hop_length=hop_length)
    total_pause_time = sum(p["duration"] for p in pauses)
    avg_pause_time = float(np.mean([p["duration"] for p in pauses])) if pauses else 0.0
    
    # 4. Speech Rate (WPM)
    word_count = len(transcript.strip().split()) if transcript.strip() else 0
    effective_duration = max(duration, 0.1)
    speech_rate_wpm = round((word_count / effective_duration) * 60.0, 1)
    
    phonation_time = max(duration - total_pause_time, 0.1)
    articulation_rate_wpm = round((word_count / phonation_time) * 60.0, 1)
    
    # 5. MFCC and Spectral Centroid
    mfcc, spectral_centroid = compute_mfcc_and_spectral(y, sr=sr, hop_length=hop_length)
    
    # 6. Downsampled Time Series for responsive frontend charts
    num_frames = len(rms)
    step = max(1, num_frames // target_points)
    
    time_points = []
    pitch_points = []
    energy_points = []
    
    for i in range(0, num_frames, step):
        t = round(i * frame_duration, 2)
        # Average pitch and rms across window
        w_f0 = f0[i : i + step]
        w_voiced = w_f0[w_f0 > 0]
        val_f0 = round(float(np.mean(w_voiced)), 1) if len(w_voiced) > 0 else 0.0
        val_rms = round(float(np.mean(rms[i : i + step])), 4)
        
        time_points.append(t)
        pitch_points.append(val_f0)
        energy_points.append(val_rms)

    summary = {
        "duration": round(duration, 2),
        "speech_rate_wpm": speech_rate_wpm,
        "articulation_rate_wpm": articulation_rate_wpm,
        "pause_count": len(pauses),
        "total_pause_duration_sec": round(total_pause_time, 2),
        "average_pause_sec": round(avg_pause_time, 2),
        "median_f0_hz": round(median_f0, 1),
        "f0_std_hz": round(f0_std, 1),
        "f0_range_hz": round(f0_range, 1),
        "rms_energy_mean": round(float(np.mean(rms)), 4),
        "rms_energy_std": round(float(np.std(rms)), 4),
        "spectral_centroid_mean": round(float(np.mean(spectral_centroid)), 1)
    }

    return {
        "summary": summary,
        "pauses": pauses,
        "times": time_points,
        "pitch": pitch_points,
        "energy": energy_points,
        "raw_rms": rms,
        "raw_f0": f0,
        "raw_voiced": voiced,
        "mfcc_mean": np.mean(mfcc, axis=1).tolist(),
        "mfcc_shape": list(mfcc.shape)
    }
