import os
import dspy
from dotenv import load_dotenv

load_dotenv()

lm = dspy.LM("openai/gpt-4o-mini")
dspy.configure(lm=lm)


class AppointmentConfirmation(dspy.Signature):
    """Generate a warm Hinglish script to confirm a gastroenterology appointment."""

    patient_name: str = dspy.InputField(desc="Patient's name")
    appointment_time: str = dspy.InputField(desc="Appointment date and time")
    doctor_name: str = dspy.InputField(desc="Doctor's name")
    confirmation_response: str = dspy.OutputField(
        desc="Natural Hinglish script to open the call and confirm attendance"
    )


class SymptomCollection(dspy.Signature):
    """Generate conversational Hinglish questions to collect current symptoms."""

    patient_history: str = dspy.InputField(desc="Patient's past diagnosis and medications")
    reflexion_notes: str = dspy.InputField(desc="Lessons from previous calls on how to improve")
    symptom_questions: str = dspy.OutputField(
        desc="Natural, non-clinical questions to gather current symptoms and medication changes"
    )


class FastingInstructions(dspy.Signature):
    """Generate clear fasting instructions for a patient before a procedure."""

    procedure_type: str = dspy.InputField(desc="Type of procedure or consultation")
    patient_age: str = dspy.InputField(desc="Patient age")
    reflexion_notes: str = dspy.InputField(desc="Past confusion points about fasting to address proactively")
    fasting_script: str = dspy.OutputField(
        desc="Simple, step-by-step fasting instructions in Hinglish. State proactively, before patient asks."
    )


class PreVisitConversation(dspy.Module):
    def __init__(self):
        self.confirm = dspy.ChainOfThought(AppointmentConfirmation)
        self.collect_symptoms = dspy.ChainOfThought(SymptomCollection)
        self.fasting = dspy.ChainOfThought(FastingInstructions)

    def forward(self, patient_name, appointment_time, doctor_name,
                patient_history, reflexion_notes, procedure_type, patient_age):

        confirmation = self.confirm(
            patient_name=patient_name,
            appointment_time=appointment_time,
            doctor_name=doctor_name,
        )
        symptoms = self.collect_symptoms(
            patient_history=patient_history,
            reflexion_notes=reflexion_notes,
        )
        fasting = self.fasting(
            procedure_type=procedure_type,
            patient_age=patient_age,
            reflexion_notes=reflexion_notes,
        )

        return dspy.Prediction(
            confirmation_script=confirmation.confirmation_response,
            symptom_questions=symptoms.symptom_questions,
            fasting_instructions=fasting.fasting_script,
        )


_program = PreVisitConversation()


def build_system_prompt(patient_data: dict, appointment_data: dict,
                         patient_history: str, reflexion_notes: str) -> str:

    result = _program(
        patient_name=patient_data["name"],
        appointment_time=str(appointment_data.get("appointment_time", "")),
        doctor_name=appointment_data.get("doctor_name", "the doctor"),
        patient_history=patient_history,
        reflexion_notes=reflexion_notes,
        procedure_type=appointment_data.get("procedure", "gastroenterology consultation"),
        patient_age=str(patient_data.get("age", "unknown")),
    )

    return f"""You are a pre-visit agent for Bhopal Institute of Gastroenterology.
You are calling to confirm an appointment and collect pre-visit information.
Speak in simple Hinglish — mix Hindi and English naturally. Be warm, patient, and clear. Never rush the patient.

APPOINTMENT CONFIRMATION APPROACH:
{result.confirmation_script}

SYMPTOM COLLECTION APPROACH:
{result.symptom_questions}

FASTING INSTRUCTIONS (state proactively, before patient asks):
{result.fasting_instructions}

PATIENT HISTORY CONTEXT:
{patient_history}

REFLEXION NOTES FROM PREVIOUS CALLS:
{reflexion_notes}

COLLECT THIS INFORMATION:
1. Appointment confirmed yes/no
2. Current symptoms
3. Current medications
4. Fasting compliance if applicable
5. Any questions from patient
6. Any urgent concerns to flag

Keep the call under 5 minutes. Be conversational, not clinical.
End warmly. Tell them to call if they have questions.
"""
