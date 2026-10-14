import uuid
import numpy as np
from typing import List, Dict, Any

def merge_adjacent_intervals(
    raw_flaws: List[Dict[str, Any]],
    time_tolerance: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Merges contiguous or closely spaced detected flaws of the same category
    to prevent frame-level spamming and provide coherent, human-actionable intervals.
    """
    if not raw_flaws:
        return []
        
    # Sort by start_time
    sorted_flaws = sorted(raw_flaws, key=lambda x: (x["category"], x["start_time"]))
    merged = []
    
    current = sorted_flaws[0].copy()
    
    for flaw in sorted_flaws[1:]:
        if (flaw["category"] == current["category"] and 
            flaw["start_time"] <= current["end_time"] + time_tolerance):
            # Extend current interval
            current["end_time"] = max(current["end_time"], flaw["end_time"])
            # Keep highest severity or average deviation
            if abs(flaw["deviation"]) > abs(current["deviation"]):
                current["severity"] = flaw["severity"]
                current["measured_value"] = flaw["measured_value"]
                current["deviation"] = flaw["deviation"]
                current["explanation"] = flaw["explanation"]
                current["recommendation"] = flaw["recommendation"]
        else:
            merged.append(current)
            current = flaw.copy()
            
    merged.append(current)
    # Sort chronologically by start_time
    merged.sort(key=lambda x: x["start_time"])
    return merged

def detect_speech_flaws(
    ref_features: Dict[str, Any],
    part_features: Dict[str, Any],
    thresholds: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Deterministic contrastive flaw detection engine.
    Compares participant features against the ideal reference delivery and configured thresholds.
    """
    flaws = []
    
    pacing_tol_pct = float(thresholds.get("pacing_tolerance_pct", 25.0))
    excessive_pause_threshold = float(thresholds.get("excessive_pause_sec", 1.8))
    min_pause_threshold = float(thresholds.get("min_pause_sec", 0.35))
    pitch_range_tolerance = float(thresholds.get("pitch_range_tolerance_hz", 40.0))
    energy_burst_tolerance = float(thresholds.get("energy_burst_tolerance_db", 10.0))
    
    ref_summary = ref_features["summary"]
    part_summary = part_features["summary"]
    
    ref_wpm = max(1.0, ref_summary["speech_rate_wpm"])
    part_wpm = part_summary["speech_rate_wpm"]
    part_duration = part_summary["duration"]
    
    # ---------------- RULE 1: FAST PACING ----------------
    wpm_diff_pct = ((part_wpm - ref_wpm) / ref_wpm) * 100.0
    if wpm_diff_pct > pacing_tol_pct:
        severity = "Critical" if wpm_diff_pct > 60.0 else ("Major" if wpm_diff_pct > 40.0 else "Moderate")
        flaws.append({
            "id": f"flaw-{uuid.uuid4().hex[:8]}",
            "start_time": 0.0,
            "end_time": round(part_duration, 2),
            "category": "Excessive Speaking Rate",
            "severity": severity,
            "measured_value": round(part_wpm, 1),
            "reference_value": round(ref_wpm, 1),
            "deviation": round(wpm_diff_pct, 1),
            "explanation": f"Overall delivery rate was {part_wpm} WPM compared to {ref_wpm} WPM in the reference ({wpm_diff_pct:+.1f}% faster). Rapid delivery can compromise listener comprehension and articulation clarity.",
            "recommendation": "Adopt conscious breathing pauses at clause boundaries and stretch key operative words to allow arguments to resonate.",
            "confidence_or_quality": 0.95
        })

    # ---------------- RULE 6: SLOW OR HESITANT DELIVERY ----------------
    elif wpm_diff_pct < -pacing_tol_pct:
        severity = "Critical" if wpm_diff_pct < -50.0 else ("Major" if wpm_diff_pct < -35.0 else "Moderate")
        flaws.append({
            "id": f"flaw-{uuid.uuid4().hex[:8]}",
            "start_time": 0.0,
            "end_time": round(part_duration, 2),
            "category": "Slow or Hesitant Pacing",
            "severity": severity,
            "measured_value": round(part_wpm, 1),
            "reference_value": round(ref_wpm, 1),
            "deviation": round(wpm_diff_pct, 1),
            "explanation": f"Delivery rate was {part_wpm} WPM versus {ref_wpm} WPM in reference ({abs(wpm_diff_pct):.1f}% slower), indicating hesitant tempo or prolonged pauses.",
            "recommendation": "Maintain vocal forward momentum across transitional phrases and eliminate unnatural trailing pauses.",
            "confidence_or_quality": 0.92
        })

    # ---------------- RULE 2: EXCESSIVE PAUSES & AWKWARD SILENCE ----------------
    part_pauses = part_features.get("pauses", [])
    ref_pauses = ref_features.get("pauses", [])
    
    for pause in part_pauses:
        p_dur = pause["duration"]
        p_start = pause["start"]
        p_end = pause["end"]
        
        # Check if pause is unusually long or not present in reference
        if p_dur >= excessive_pause_threshold:
            severity = "Critical" if p_dur > 3.0 else ("Major" if p_dur > 2.2 else "Moderate")
            flaws.append({
                "id": f"flaw-{uuid.uuid4().hex[:8]}",
                "start_time": p_start,
                "end_time": p_end,
                "category": "Excessive Pause",
                "severity": severity,
                "measured_value": round(p_dur, 2),
                "reference_value": round(ref_summary.get("average_pause_sec", 0.8), 2),
                "deviation": round(p_dur - excessive_pause_threshold, 2),
                "explanation": f"Unusually long pause of {p_dur:.2f}s detected from {p_start:.1f}s to {p_end:.1f}s (configured limit: {excessive_pause_threshold:.2f}s).",
                "recommendation": "Use intentional micro-pauses (0.5s - 1.0s) for rhetorical emphasis rather than prolonged gaps that break listener engagement.",
                "confidence_or_quality": 0.98
            })

    # ---------------- RULE 3: FLAT PITCH / MONOTONE VOCAL DELIVERY ----------------
    ref_f0_range = ref_summary.get("f0_range_hz", 80.0)
    part_f0_range = part_summary.get("f0_range_hz", 20.0)
    
    if ref_f0_range > 30.0 and part_f0_range < pitch_range_tolerance:
        deviation = round(part_f0_range - ref_f0_range, 1)
        severity = "Critical" if part_f0_range < 15.0 else "Major"
        flaws.append({
            "id": f"flaw-{uuid.uuid4().hex[:8]}",
            "start_time": 0.0,
            "end_time": round(part_duration, 2),
            "category": "Flat Pitch Variation",
            "severity": severity,
            "measured_value": round(part_f0_range, 1),
            "reference_value": round(ref_f0_range, 1),
            "deviation": deviation,
            "explanation": f"Participant pitch range was only {part_f0_range} Hz (Reference: {ref_f0_range} Hz). Monotone delivery diminishes emotional connection and rhetorical impact.",
            "recommendation": "Vary vocal inflection: elevate pitch slightly on interrogatives and emphasize climax keywords with dynamic pitch lift.",
            "confidence_or_quality": 0.90
        })

    # ---------------- RULE 4: SUDDEN LOUDNESS CHANGES / ENERGY BURSTS ----------------
    part_rms = part_features.get("raw_rms", np.array([]))
    sr = 16000
    hop = 512
    frame_dur = hop / sr
    
    if len(part_rms) > 10:
        local_mean = np.convolve(part_rms, np.ones(9)/9, mode='same')
        db_diff = 20 * np.log10((part_rms + 1e-6) / (local_mean + 1e-6))
        
        burst_indices = np.where(db_diff > energy_burst_tolerance)[0]
        for idx in burst_indices:
            t = round(idx * frame_dur, 2)
            db_val = round(float(db_diff[idx]), 1)
            flaws.append({
                "id": f"flaw-{uuid.uuid4().hex[:8]}",
                "start_time": max(0.0, round(t - 0.2, 2)),
                "end_time": min(round(part_duration, 2), round(t + 0.3, 2)),
                "category": "Sudden Loudness Change",
                "severity": "Moderate" if db_val < 15.0 else "Major",
                "measured_value": db_val,
                "reference_value": energy_burst_tolerance,
                "deviation": round(db_val - energy_burst_tolerance, 1),
                "explanation": f"Abrupt acoustic energy jump of +{db_val} dB relative to local baseline at {t:.1f}s. This may indicate plosive microphone pops or jarring vocal volume spikes.",
                "recommendation": "Modulate microphone distance and control plosives ('p', 'b', 't') through smooth diaphragmatic breath support.",
                "confidence_or_quality": 0.88
            })

    # ---------------- RULE 5: UNUSUAL ACOUSTIC DIFFERENCE (MFCC SPECTRAL) ----------------
    ref_mfcc = np.array(ref_features.get("mfcc_mean", []))
    part_mfcc = np.array(part_features.get("mfcc_mean", []))
    
    if len(ref_mfcc) > 0 and len(part_mfcc) > 0:
        mfcc_dist = float(np.linalg.norm(ref_mfcc - part_mfcc))
        if mfcc_dist > 45.0:
            flaws.append({
                "id": f"flaw-{uuid.uuid4().hex[:8]}",
                "start_time": 0.0,
                "end_time": round(part_duration, 2),
                "category": "Spectral Timbre Discrepancy",
                "severity": "Minor",
                "measured_value": round(mfcc_dist, 2),
                "reference_value": 30.0,
                "deviation": round(mfcc_dist - 30.0, 2),
                "explanation": f"Spectral envelope distance is {mfcc_dist:.1f}. Note: MFCC differences reflect acoustic environment and vocal timbre, and do not necessarily mean flawed rhetorical delivery.",
                "recommendation": "Check microphone quality and ambient reverberation to optimize vocal presence.",
                "confidence_or_quality": 0.80
            })

    # Merge frame-level duplicates
    merged_flaws = merge_adjacent_intervals(flaws, time_tolerance=0.8)
    return merged_flaws
