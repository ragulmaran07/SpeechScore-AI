from typing import Dict, Any, List, Tuple

def calculate_rubric_scores(
    ref_features: Dict[str, Any],
    part_features: Dict[str, Any],
    issues: List[Dict[str, Any]],
    weights: Dict[str, float]
) -> Dict[str, Any]:
    """
    Computes explainable, transparent rubric scores (0 - 100)
    using reference-relative measurements and severity penalties.
    """
    ref_summary = ref_features["summary"]
    part_summary = part_features["summary"]
    
    # 1. Pacing & Speech Rate (0 - 100)
    ref_wpm = max(1.0, ref_summary.get("speech_rate_wpm", 130.0))
    part_wpm = part_summary.get("speech_rate_wpm", 130.0)
    wpm_deviation_pct = abs(part_wpm - ref_wpm) / ref_wpm * 100.0
    # Penalty: 1.5 points per % deviation over 10% tolerance
    pacing_penalty = max(0.0, (wpm_deviation_pct - 10.0) * 1.5)
    score_pacing = max(20.0, min(100.0, 100.0 - pacing_penalty))
    
    # 2. Pauses & Fluency (0 - 100)
    # Penalize based on excessive pause issues
    pause_issues = [iss for iss in issues if iss["category"] == "Excessive Pause"]
    pause_penalty = 0.0
    for iss in pause_issues:
        sev = iss.get("severity", "Moderate")
        if sev == "Critical":
            pause_penalty += 25.0
        elif sev == "Major":
            pause_penalty += 15.0
        elif sev == "Moderate":
            pause_penalty += 10.0
        else:
            pause_penalty += 5.0
    score_pauses = max(25.0, min(100.0, 100.0 - pause_penalty))
    
    # 3. Vocal Variation & Pitch (0 - 100)
    ref_f0_range = max(10.0, ref_summary.get("f0_range_hz", 60.0))
    part_f0_range = part_summary.get("f0_range_hz", 40.0)
    f0_ratio = part_f0_range / ref_f0_range
    if f0_ratio >= 0.8:
        score_pitch = min(100.0, 85.0 + (f0_ratio - 0.8) * 50.0)
    else:
        # Flat pitch penalty
        score_pitch = max(30.0, f0_ratio * 100.0)
    if any(iss["category"] == "Flat Pitch Variation" for iss in issues):
        score_pitch = min(score_pitch, 60.0)

    # 4. Loudness Consistency & Energy Dynamics (0 - 100)
    loudness_issues = [iss for iss in issues if iss["category"] == "Sudden Loudness Change"]
    loudness_penalty = min(60.0, len(loudness_issues) * 12.0)
    score_loudness = max(30.0, 100.0 - loudness_penalty)

    # 5. Acoustic Clarity & Spectral Measures (0 - 100)
    ref_sc = max(100.0, ref_summary.get("spectral_centroid_mean", 1800.0))
    part_sc = max(100.0, part_summary.get("spectral_centroid_mean", 1800.0))
    sc_ratio = abs(part_sc - ref_sc) / ref_sc
    score_clarity = max(40.0, min(100.0, 100.0 - (sc_ratio * 40.0)))
    if any(iss["category"] == "Spectral Timbre Discrepancy" for iss in issues):
        score_clarity = max(50.0, score_clarity - 10.0)

    # 6. Rhetorical Emphasis (0 - 100)
    # Default baseline based on balanced pitch and energy dynamics
    score_rhetorical = round((score_pitch * 0.5 + score_pacing * 0.5), 1)

    category_scores = {
        "pacing": round(score_pacing, 1),
        "pauses": round(score_pauses, 1),
        "pitch_variation": round(score_pitch, 1),
        "loudness_consistency": round(score_loudness, 1),
        "spectral_clarity": round(score_clarity, 1),
        "rhetorical_emphasis": round(score_rhetorical, 1)
    }

    # Normalize weights to sum to 1.0
    total_weight = sum(weights.values()) if weights else 100.0
    if total_weight <= 0:
        total_weight = 100.0

    overall_score = 0.0
    for cat, score in category_scores.items():
        w = weights.get(cat, 16.66) / total_weight
        overall_score += score * w

    overall_score = round(overall_score, 1)

    # Strengths and Improvements
    strengths = []
    improvements = []

    if score_pacing >= 85.0:
        strengths.append(f"Excellent Pacing ({part_wpm} WPM matches reference tempo)")
    elif score_pacing < 70.0:
        improvements.append(f"Pacing calibration: rate is {part_wpm} WPM vs reference {ref_wpm} WPM")

    if score_pauses >= 85.0:
        strengths.append("Fluid cadence with natural rhetorical pauses")
    elif score_pauses < 70.0:
        improvements.append("Reduce prolonged or awkward silences between sentences")

    if score_pitch >= 85.0:
        strengths.append(f"Dynamic vocal modulation and broad pitch range ({part_f0_range:.0f} Hz)")
    elif score_pitch < 70.0:
        improvements.append(f"Elevate vocal variety: currently monotone pitch range ({part_f0_range:.0f} Hz)")

    if score_loudness >= 85.0:
        strengths.append("Controlled projection with consistent dynamic volume")
    elif score_loudness < 70.0:
        improvements.append("Smooth out sudden volume bursts and microphone pops")

    if score_clarity >= 85.0:
        strengths.append("Clear articulation and balanced spectral resonance")

    if not strengths:
        strengths.append("Consistent spoken delivery with recognizable transcript alignment")
    if not improvements:
        improvements.append("Maintain existing vocal poise while refining micro-inflections for advanced oratorical polish")

    return {
        "overall_score": overall_score,
        "category_scores": category_scores,
        "strengths": strengths,
        "improvements": improvements,
        "total_weight_sum": total_weight
    }
