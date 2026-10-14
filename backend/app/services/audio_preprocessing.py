import os
import wave
import numpy as np
import scipy.signal
import scipy.io.wavfile
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

try:
    import soundfile as sf
    HAS_SOUNDFILE = True
except ImportError:
    HAS_SOUNDFILE = False

try:
    import librosa
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

class AudioPreprocessingError(Exception):
    pass

def load_and_preprocess_audio(
    file_path: str,
    target_sr: int = 16000
) -> Tuple[np.ndarray, int, float, Dict[str, Any]]:
    """
    Loads an audio file, converts it to mono, resamples to target_sr,
    and returns (audio_array, sample_rate, duration, metadata).
    Supports WAV, FLAC, OGG, and common audio formats.
    """
    path = Path(file_path)
    if not path.exists():
        raise AudioPreprocessingError(f"Audio file not found: {file_path}")
    
    file_size_bytes = path.stat().st_size
    if file_size_bytes < 100:
        raise AudioPreprocessingError("Audio file is empty or corrupted (file size too small).")
    
    y = None
    sr = None
    channels = 1
    
    # Attempt 1: SoundFile
    if HAS_SOUNDFILE:
        try:
            data, native_sr = sf.read(str(path), always_2d=True)
            sr = native_sr
            # Convert to mono by averaging channels
            y = np.mean(data, axis=1).astype(np.float32)
            channels = data.shape[1]
        except Exception:
            y = None
            
    # Attempt 2: Librosa
    if y is None and HAS_LIBROSA:
        try:
            data, native_sr = librosa.load(str(path), sr=None, mono=True)
            y = data.astype(np.float32)
            sr = native_sr
        except Exception:
            y = None
            
    # Attempt 3: Standard wave module (pure python WAV)
    if y is None and path.suffix.lower() == ".wav":
        try:
            with wave.open(str(path), "rb") as wf:
                native_sr = wf.getframerate()
                n_channels = wf.getnchannels()
                sampwidth = wf.getsampwidth()
                n_frames = wf.getnframes()
                raw_bytes = wf.readframes(n_frames)
                
                if sampwidth == 2:
                    dtype = np.int16
                    norm = 32768.0
                elif sampwidth == 4:
                    dtype = np.int32
                    norm = 2147483648.0
                elif sampwidth == 1:
                    dtype = np.uint8
                    norm = 128.0
                else:
                    raise AudioPreprocessingError(f"Unsupported sample width: {sampwidth}")
                
                data = np.frombuffer(raw_bytes, dtype=dtype)
                if n_channels > 1:
                    data = data.reshape(-1, n_channels)
                    y = np.mean(data, axis=1) / norm
                else:
                    y = data / norm
                y = y.astype(np.float32)
                sr = native_sr
                channels = n_channels
        except Exception as e:
            y = None

    if y is None or sr is None:
        raise AudioPreprocessingError(f"Could not decode audio file {path.name}. Supported formats: uncompressed WAV, FLAC, OGG.")

    # Check for empty / near zero length
    if len(y) == 0:
        raise AudioPreprocessingError("Decoded audio stream contains zero samples.")
        
    duration = len(y) / float(sr)
    if duration < 0.5:
        raise AudioPreprocessingError(f"Audio duration is too short ({duration:.2f}s). Minimum required is 0.5s.")

    # Resample to target_sr if different
    if sr != target_sr:
        num_target_samples = int(round(len(y) * float(target_sr) / sr))
        # Use scipy resample
        y_resampled = scipy.signal.resample(y, num_target_samples).astype(np.float32)
        y = y_resampled
        sr = target_sr

    # Check for silence (near zero RMS)
    rms = float(np.sqrt(np.mean(y**2)))
    if rms < 1e-4:
        raise AudioPreprocessingError("Audio recording is virtually silent. Please upload a clear vocal recording.")

    # Peak amplitude and relative normalization without destroying dynamics
    max_abs = float(np.max(np.abs(y)))
    
    metadata = {
        "file_name": path.name,
        "original_file_size_bytes": file_size_bytes,
        "sample_rate": sr,
        "channels_original": channels,
        "duration_seconds": round(duration, 3),
        "total_samples": len(y),
        "overall_rms": round(rms, 5),
        "peak_amplitude": round(max_abs, 4)
    }
    
    return y, sr, duration, metadata
