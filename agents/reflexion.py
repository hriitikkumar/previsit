import os
import json
from openai import OpenAI

_client = OpenAI()

REFLEXION_SYSTEM = """You are a harsh, specific reviewer analyzing a pre-visit phone call made to a
gastroenterology patient in India. Your job is to catch real failures, not to be diplomatic.

Score the call 1-10 on:
- confirmation_score: Did the patient clearly confirm or deny the appointment?
- information_score: Did we collect symptoms, medications, fasting compliance?
- clarity_score: Did the patient understand the instructions?
- warmth_score: Did the patient feel comfortable and not rushed?
- efficiency_score: Was the call concise and under 5 minutes?

Rules for scoring — do not be lenient:
- If the agent misunderstood the patient, asked confused/nonsensical follow-ups, hallucinated a reason to
  end the call, or the conversation broke down at any point, confirmation_score and clarity_score must be
  3 or below regardless of how the call ended.
- If any part of the transcript is garbled, nonsensical, or clearly a transcription error that the agent
  had to work around, say so explicitly in what_went_wrong — do not paper over it with a generic note.
- A "critique" like "communication could be clearer" or "ask more follow-up questions" is not acceptable —
  it must reference a specific line or moment from the transcript.

Then identify:
- what_went_wrong: Specific moments where the call failed. Quote the exact transcript line(s), not a
  paraphrase.
- what_to_do_differently: Concrete, actionable changes for the next call — tied to the specific failure
  quoted above, not generic advice that could apply to any call.
- key_learning: One sentence — the single most important fix, specific enough that it wouldn't apply to a
  different, unrelated call.

IMPORTANT: You will be told whether this specific appointment required fasting or not. Never suggest
fasting-related advice (in critique, what_to_do_differently, or key_learning) for an appointment that does
not require fasting — that advice would be actively wrong and confusing if fed into a future call for a
similarly non-fasting appointment. Only mention fasting if it was actually relevant to this call.

Return valid JSON matching this shape exactly (this is a structural example only — do not reuse its
specific topic, always base your actual answer on what really happened in the transcript you were given):
{
  "overall_score": 7,
  "confirmation_score": 8,
  "information_score": 6,
  "clarity_score": 7,
  "warmth_score": 9,
  "efficiency_score": 6,
  "critique": "<one sentence tied to a specific moment in THIS transcript>",
  "what_went_wrong": "<quote the exact transcript line where something broke down>",
  "what_to_do_differently": "<a concrete change tied to the quote above>",
  "key_learning": "<one sentence, specific enough that it wouldn't apply to a different, unrelated call>"
}"""


def run_reflexion(transcript: str, pre_visit_summary: dict, requires_fasting: bool = False) -> dict:
    fasting_context = (
        "This appointment DOES require fasting/prep instructions."
        if requires_fasting
        else "This appointment does NOT require any fasting or prep — do not suggest fasting-related "
        "advice for this call under any circumstance."
    )
    response = _client.chat.completions.create(
        model="gpt-4o-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": REFLEXION_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"{fasting_context}\n\n"
                    f"TRANSCRIPT:\n{transcript}\n\n"
                    f"WHAT WE COLLECTED:\n{json.dumps(pre_visit_summary, indent=2)}\n\n"
                    "Analyze this call."
                ),
            },
        ],
    )
    return json.loads(response.choices[0].message.content)


def get_reflexion_notes(db, requires_fasting: bool = False, limit: int = 3) -> str:
    recent = db.fetch_recent_reflexions(limit=limit, requires_fasting=requires_fasting)
    if not recent:
        return "No previous call experience yet."
    lines = [f"- {r['key_learning']} (score: {r['overall_score']}/10)" for r in recent]
    return "Lessons from recent calls:\n" + "\n".join(lines)
