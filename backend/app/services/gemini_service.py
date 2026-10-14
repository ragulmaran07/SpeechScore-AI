import json
import httpx
from typing import Dict, Any, Optional
from app.config import settings
from app.services.explanations import generate_deterministic_explanation

async def enhance_issue_coaching_with_gemini(
    issue: Dict[str, Any],
    speech_category: str,
    transcript_fragment: str = ""
) -> Dict[str, str]:
    """
    Optionally queries Gemini API to generate friendly, conversational coaching advice
    grounded firmly in the verified mathematical evidence.
    If no API key is configured or request fails, seamlessly returns deterministic coaching.
    """
    # Baseline fallback
    baseline = generate_deterministic_explanation(issue, transcript_fragment)
    
    if not settings.GEMINI_API_KEY or len(settings.GEMINI_API_KEY.strip()) < 5:
        return baseline
        
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    
    prompt = f"""You are an elite collegiate forensics and speech coach.
Turn this measured audio signal processing flaw into supportive, actionable, and human-readable feedback.

Category of Speech: {speech_category}
Detected Flaw: {issue.get('category')}
Severity: {issue.get('severity')}
Measured Value: {issue.get('measured_value')}
Reference Value: {issue.get('reference_value')}
Timestamp: {issue.get('start_time')}s - {issue.get('end_time')}s
Mathematical Explanation: {baseline['explanation']}
Transcript Excerpt: "{transcript_fragment}"

CRITICAL RULES:
1. DO NOT invent fake scores or change the measured numbers.
2. Provide a concise, clear explanation of why this delivery issue matters rhetorically.
3. Provide 1 or 2 specific, physical practice exercises to improve.
4. Provide a 1-sentence positive encouragement.

Return ONLY valid JSON matching this schema:
{{
  "explanation": "concise explanation",
  "recommendation": "1 or 2 actionable exercises and encouragement"
}}
"""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                endpoint,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"}
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)
                if "explanation" in parsed and "recommendation" in parsed:
                    return {
                        "explanation": parsed["explanation"],
                        "recommendation": parsed["recommendation"]
                    }
    except Exception:
        # Graceful fallback to deterministic
        pass
        
    return baseline
