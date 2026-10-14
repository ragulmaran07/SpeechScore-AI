from typing import Dict, Any, List

def format_timestamp(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m:02d}:{s:02d}"

def generate_deterministic_explanation(issue: Dict[str, Any], transcript: str = "") -> Dict[str, str]:
    """
    Constructs an evidence-grounded causal explanation and actionable coaching recommendation
    using exact mathematical measurements from signal processing.
    """
    category = issue.get("category", "")
    start_t = format_timestamp(issue.get("start_time", 0.0))
    end_t = format_timestamp(issue.get("end_time", 0.0))
    measured = issue.get("measured_value", 0.0)
    reference = issue.get("reference_value", 0.0)
    deviation = issue.get("deviation", 0.0)
    severity = issue.get("severity", "Moderate")

    if category == "Excessive Speaking Rate":
        explanation = (
            f"From {start_t} to {end_t}, the estimated speaking rate reached {measured:.0f} WPM, "
            f"compared with {reference:.0f} WPM in the reference recording. This is approximately {abs(deviation):.1f}% higher. "
            f"The selected collegiate rubric flags this deviation at {severity} severity because exceeding 160 WPM limits "
            f"audience retention and impairs natural rhetorical emphasis."
        )
        recommendation = (
            "Deliberately extend vowel duration on key conceptual nouns and insert a clean half-second pause "
            "after critical assertions to let your message sink in."
        )

    elif category == "Slow or Hesitant Pacing":
        explanation = (
            f"From {start_t} to {end_t}, delivery tempo decelerated to {measured:.0f} WPM "
            f"versus {reference:.0f} WPM in the reference (a {abs(deviation):.1f}% reduction). "
            f"Prolonged hesitation can diminish conversational energy and oratorical conviction."
        )
        recommendation = (
            "Practice continuous breath phrasing: connect prepositional phrases smoothly without stopping "
            "unless intending a dramatic pause."
        )

    elif category == "Excessive Pause":
        explanation = (
            f"Between {start_t} and {end_t}, a sustained silence of {measured:.2f} seconds was measured. "
            f"The baseline reference utilized an average transition pause of {reference:.2f}s. "
            f"A silence of this length is perceived by listeners as an involuntary memory lapse or hesitation."
        )
        recommendation = (
            "Bridge the transition by maintaining physical presence and eye contact, "
            "and resume within 0.8–1.2 seconds to sustain dramatic tension without stalling momentum."
        )

    elif category == "Flat Pitch Variation":
        explanation = (
            f"Throughout the speech window, participant F0 fundamental frequency variation was restricted to {measured:.1f} Hz, "
            f"compared to {reference:.1f} Hz in the reference delivery. This represents a monotone acoustic profile."
        )
        recommendation = (
            "Incorporate tonal contrast: elevate pitch on questions and provocative thoughts, "
            "and drop down to your chest resonance for authoritative closing statements."
        )

    elif category == "Sudden Loudness Change":
        explanation = (
            f"At {start_t}, an acoustic energy spike of +{measured:.1f} dB relative to local baseline was captured. "
            f"The configured burst tolerance is {reference:.1f} dB. Abrupt acoustic spikes create jarring audio distortion."
        )
        recommendation = (
            "Soften explosive plosive consonants ('p', 'b', 'k') by angling slightly off-axis from the microphone "
            "and maintaining uniform vocal projection."
        )

    else:
        explanation = (
            f"At {start_t} - {end_t}, an acoustic difference of {measured:.2f} was recorded against reference {reference:.2f}. "
            f"Mathematical deviation: {deviation:+.2f}."
        )
        recommendation = "Review playback in the Comparison Studio to calibrate acoustic consistency with the reference."

    return {
        "explanation": explanation,
        "recommendation": recommendation
    }
