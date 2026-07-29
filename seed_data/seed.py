from datetime import datetime, timedelta
from services.rag_service import index_patient_history

PATIENTS = [
    {
        "name": "Ramesh Sharma",
        "phone": "+91XXXXXXXXXX",
        "age": 58,
        "language_preference": "hinglish",
        "history": [
            {
                "visit_date": "2026-03-15",
                "diagnosis": "GERD - Gastroesophageal Reflux Disease",
                "medications": ["Pantoprazole 40mg", "Domperidone 10mg"],
                "notes": "Patient reports burning sensation after meals. Advised to avoid spicy food and eat smaller meals.",
            }
        ],
        "appointment": {
            "doctor_name": "Dr. Agarwal",
            "department": "gastroenterology",
            "procedure_type": None,
            "requires_fasting": False,
        },
    },
    {
        "name": "Priya Verma",
        "phone": "+91XXXXXXXXXX",
        "age": 34,
        "language_preference": "hinglish",
        "history": [
            {
                "visit_date": "2026-04-02",
                "diagnosis": "IBS - Irritable Bowel Syndrome",
                "medications": ["Mebeverine 135mg", "Fiber supplement"],
                "notes": "Stress-related flare ups, bloating improving with fiber supplement.",
            }
        ],
        "appointment": {
            "doctor_name": "Dr. Mehra",
            "department": "gastroenterology",
            "procedure_type": None,
            "requires_fasting": False,
        },
    },
    {
        "name": "Fatima Sheikh",
        "phone": "+91XXXXXXXXXX",
        "age": 52,
        "language_preference": "hinglish",
        "history": [
            {
                "visit_date": "2026-05-10",
                "diagnosis": "Scheduled for colonoscopy",
                "medications": [],
                "notes": "Requires full bowel prep and fasting from midnight before the procedure.",
            }
        ],
        "appointment": {
            "doctor_name": "Dr. Agarwal",
            "department": "gastroenterology",
            "procedure_type": "colonoscopy",
            "requires_fasting": True,
        },
    },
    {
        "name": "Arjun Nair",
        "phone": "+91XXXXXXXXXX",
        "age": 29,
        "language_preference": "hinglish",
        "history": [
            {
                "visit_date": "2026-06-01",
                "diagnosis": "Gastritis - routine follow-up",
                "medications": ["Pantoprazole 40mg"],
                "notes": "Symptoms resolved, continuing medication as maintenance.",
            }
        ],
        "appointment": {
            "doctor_name": "Dr. Mehra",
            "department": "gastroenterology",
            "procedure_type": None,
            "requires_fasting": False,
        },
    },
]


def create_test_patients(db) -> list[dict]:
    tomorrow = datetime.now() + timedelta(days=1)
    created = []

    for i, p in enumerate(PATIENTS):
        patient_id = db.create_patient(
            {
                "name": p["name"],
                "phone": p["phone"],
                "age": p["age"],
                "language_preference": p["language_preference"],
            }
        )

        db.create_patient_history(patient_id, p["history"][0])
        index_patient_history(patient_id, p["history"])

        appt_time = tomorrow.replace(hour=10 + i, minute=0, second=0, microsecond=0)
        appointment_id = db.create_appointment(
            {
                "patient_id": patient_id,
                "doctor_name": p["appointment"]["doctor_name"],
                "appointment_time": appt_time,
                "department": p["appointment"]["department"],
                "procedure_type": p["appointment"].get("procedure_type"),
                "requires_fasting": p["appointment"].get("requires_fasting", False),
            }
        )

        created.append(
            {
                "patient_id": patient_id,
                "patient_name": p["name"],
                "appointment_id": appointment_id,
                "appointment_time": str(appt_time),
            }
        )

    return created
