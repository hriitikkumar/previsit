from __future__ import annotations

import instructor
from openai import OpenAI
from pydantic import BaseModel
from typing import Optional

_client = instructor.from_openai(OpenAI())


class PreVisitSummary(BaseModel):
    appointment_confirmed: bool
    current_symptoms: list[str]
    current_medications: list[str]
    fasting_compliant: Optional[bool]
    urgent_flags: list[str]
    patient_questions: list[str]
    recommended_actions: list[str]
    call_quality: str  # "complete" | "partial" | "failed"
    notes_for_doctor: str


def extract_summary(transcript: str) -> PreVisitSummary:
    return _client.chat.completions.create(
        model="gpt-4o-mini",
        response_model=PreVisitSummary,
        messages=[
            {
                "role": "system",
                "content": (
                    "Extract structured pre-visit information from this patient call transcript. "
                    "Be conservative — only mark appointment_confirmed=true if the patient explicitly confirmed. "
                    "Flag anything urgent (chest pain, bleeding, severe symptoms) in urgent_flags. "
                    "call_quality should be 'complete' if all key info was collected, 'partial' if some missing, 'failed' if call didn't work."
                ),
            },
            {
                "role": "user",
                "content": f"TRANSCRIPT:\n{transcript}",
            },
        ],
    )
