import os
import wave
import numpy as np
import scipy.signal
import scipy.io.wavfile
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

try:
    import av
    HAS_AV = True
except ImportError:
    HAS_AV = False

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

def decode_media_with_av(path: Path, target_sr: int = 16000) -> Tuple[Optional[np.ndarray], Optional[int], int]:
    """
    Decodes audio track from MP4 video or audio container using PyAV (FFmpeg).
    Returns (audio_array, sample_rate, original_channels).
    """
    if not HAS_AV:
        return None, None, 1
        
    try:
        container = av.open(str(path))
        audio_stream = next((s for s in container.streams if s.type == 'audio'), None)
        if not audio_stream:
            return None, None, 1
            
        resampler = av.AudioResampler(
            format='fltp',
            layout='mono',
            rate=target_sr
        )
        
        chunks = []
        for frame in container.decode(audio_stream):
            resampled_frames = resampler.resample(frame)
            for rf in resampled_frames:
                chunks.append(rf.to_ndarray())
                
        if not chunks:
            return None, None, 1
            
        y = np.concatenate(chunks, axis=1)[0].astype(np.float32)
        channels = getattr(audio_stream, 'channels', 1) or 1
        return y, target_sr, channels
    except Exception:
        return None, None, 1

def load_and_preprocess_audio(
    file_path: str,
    target_sr: int = 16000
) -> Tuple[np.ndarray, int, float, Dict[str, Any]]:
    """
    Loads an audio or video file, extracts the audio track, converts to mono,
    resamples to target_sr, and returns (audio_array, sample_rate, duration, metadata).
    Supports MP4, M4A, MOV, WAV, FLAC, OGG, and MP3.
    """
    path = Path(file_path)
    if not path.exists():
        raise AudioPreprocessingError(f"Audio/Video file not found: {file_path}")
    
    file_size_bytes = path.stat().st_size
    if file_size_bytes < 100:
        raise AudioPreprocessingError("File is empty or corrupted (file size too small).")
    
    y = None
    sr = None
    channels = 1
    file_ext = path.suffix.lower()
    
    # Attempt 1: If MP4/M4A/MOV or video container, prioritize PyAV (FFmpeg audio stream demuxer)
    if file_ext in [".mp4", ".m4a", ".mov", ".m4v", ".mkv"]:
        y, sr, channels = decode_media_with_av(path, target_sr)
        if y is None and not HAS_AV:
            raise AudioPreprocessingError("MP4 video/audio decoding requires PyAV. Please install av.")
            
    # Attempt 2: SoundFile (for WAV, FLAC, OGG)
    if y is None and HAS_SOUNDFILE:
        try:
            data, native_sr = sf.read(str(path), always_2d=True)
            sr = native_sr
            y = np.mean(data, axis=1).astype(np.float32)
            channels = data.shape[1]
        except Exception:
            y = None
            
    # Attempt 3: Librosa
    if y is None and HAS_LIBROSA:
        try:
            data, native_sr = librosa.load(str(path), sr=None, mono=True)
            y = data.astype(np.float32)
            sr = native_sr
        except Exception:
            y = None
            
    # Attempt 4: PyAV fallback for any remaining media format
    if y is None and HAS_AV:
        y, sr, channels = decode_media_with_av(path, target_sr)

    # Attempt 5: Standard wave module (pure python uncompressed WAV)
    if y is None and file_ext == ".wav":
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
        except Exception:
            y = None

    if y is None or sr is None:
        raise AudioPreprocessingError(
            f"Could not decode audio from {path.name}. Supported formats: MP4 (video/audio), WAV, FLAC, OGG, M4A, MP3."
        )

    # Check for empty / near zero length
    if len(y) == 0:
        raise AudioPreprocessingError("Decoded audio stream contains zero samples.")
        
    duration = len(y) / float(sr)
    if duration < 0.5:
        raise AudioPreprocessingError(f"Audio duration is too short ({duration:.2f}s). Minimum required is 0.5s.")

    # Resample to target_sr if different
    if sr != target_sr:
        num_target_samples = int(round(len(y) * float(target_sr) / sr))
        y_resampled = scipy.signal.resample(y, num_target_samples).astype(np.float32)
        y = y_resampled
        sr = target_sr

    # Check for silence (near zero RMS)
    rms = float(np.sqrt(np.mean(y**2)))
    if rms < 1e-4:
        raise AudioPreprocessingError("Recording audio track is virtually silent. Please upload a recording with audible speech.")

    # Peak amplitude and relative normalization without destroying dynamics
    max_abs = float(np.max(np.abs(y)))
    
    metadata = {
        "file_name": path.name,
        "format": file_ext.replace(".", "").upper(),
        "original_file_size_bytes": file_size_bytes,
        "sample_rate": sr,
        "channels_original": channels,
        "duration_seconds": round(duration, 3),
        "total_samples": len(y),
        "overall_rms": round(rms, 5),
        "peak_amplitude": round(max_abs, 4)
    }
    
    return y, sr, duration, metadata
