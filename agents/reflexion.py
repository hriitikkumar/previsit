import os
import json
from openai import OpenAI

_client = OpenAI()

REFLEXION_SYSTEM = """You are analyzing a pre-visit phone call made to a gastroenterology patient in India.

Score the call 1-10 on:
- confirmation_score: Did the patient clearly confirm or deny the appointment?
- information_score: Did we collect symptoms, medications, fasting compliance?
- clarity_score: Did the patient understand the instructions?
- warmth_score: Did the patient feel comfortable and not rushed?
- efficiency_score: Was the call concise and under 5 minutes?

Then identify:
- what_went_wrong: Specific moments where the call failed. Quote the transcript.
- what_to_do_differently: Concrete, actionable changes for the next call.
- key_learning: One sentence — the single most important fix.

Return valid JSON matching this shape exactly:
{
  "overall_score": 7,
  "confirmation_score": 8,
  "information_score": 6,
  "clarity_score": 7,
  "warmth_score": 9,
  "efficiency_score": 6,
  "critique": "Overall the call was warm but missed fasting instructions.",
  "what_went_wrong": "Patient asked about fasting three times...",
  "what_to_do_differently": "Explain fasting in two clear steps before asking questions...",
  "key_learning": "State fasting instructions proactively, before the patient has to ask."
}"""


def run_reflexion(transcript: str, pre_visit_summary: dict) -> dict:
    response = _client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": REFLEXION_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"TRANSCRIPT:\n{transcript}\n\n"
                    f"WHAT WE COLLECTED:\n{json.dumps(pre_visit_summary, indent=2)}\n\n"
                    "Analyze this call."
                ),
            },
        ],
    )
    return json.loads(response.choices[0].message.content)


def get_reflexion_notes(db, limit: int = 3) -> str:
    recent = db.fetch_recent_reflexions(limit=limit)
    if not recent:
        return "No previous call experience yet."
    lines = [f"- {r['key_learning']} (score: {r['overall_score']}/10)" for r in recent]
    return "Lessons from recent calls:\n" + "\n".join(lines)
