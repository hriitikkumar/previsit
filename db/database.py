from __future__ import annotations

import os
import uuid
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

CREATE_TABLES = """
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    age INTEGER,
    language_preference TEXT DEFAULT 'hinglish',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    doctor_name TEXT,
    appointment_time TIMESTAMP,
    department TEXT DEFAULT 'gastroenterology',
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id),
    visit_date DATE,
    diagnosis TEXT,
    medications TEXT[],
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id),
    patient_id UUID REFERENCES patients(id),
    vapi_call_id TEXT,
    transcript TEXT,
    call_status TEXT DEFAULT 'pending',
    duration_seconds INTEGER,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pre_visit_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_log_id UUID REFERENCES call_logs(id),
    appointment_id UUID REFERENCES appointments(id),
    appointment_confirmed BOOLEAN,
    current_symptoms TEXT[],
    current_medications TEXT[],
    fasting_compliant BOOLEAN,
    urgent_flags TEXT[],
    patient_questions TEXT[],
    recommended_actions TEXT[],
    raw_extraction JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reflexion_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_log_id UUID REFERENCES call_logs(id),
    critique TEXT,
    what_went_wrong TEXT,
    what_to_do_differently TEXT,
    key_learning TEXT,
    overall_score INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
"""


class Database:
    def __init__(self):
        self.conn = psycopg2.connect(
            os.environ["DATABASE_URL"],
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
        self.conn.autocommit = True

    def init_schema(self):
        with self.conn.cursor() as cur:
            cur.execute(CREATE_TABLES)

    # ── Patients ──────────────────────────────────────────────────

    def create_patient(self, data: dict) -> str:
        with self.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO patients (name, phone, age, language_preference)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                (data["name"], data["phone"], data.get("age"), data.get("language_preference", "hinglish")),
            )
            return str(cur.fetchone()["id"])

    def get_patient(self, patient_id: str) -> dict | None:
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM patients WHERE id = %s", (patient_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def get_all_patients(self) -> list:
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM patients ORDER BY created_at DESC")
            return [dict(r) for r in cur.fetchall()]

    # ── Appointments ──────────────────────────────────────────────

    def create_appointment(self, data: dict) -> str:
        with self.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO appointments (patient_id, doctor_name, appointment_time, department)
                   VALUES (%s, %s, %s, %s) RETURNING id""",
                (data["patient_id"], data["doctor_name"], data["appointment_time"], data.get("department", "gastroenterology")),
            )
            return str(cur.fetchone()["id"])

    def get_appointment(self, appointment_id: str) -> dict | None:
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM appointments WHERE id = %s", (appointment_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def update_appointment_status(self, appointment_id: str, status: str) -> dict | None:
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE appointments SET status = %s WHERE id = %s RETURNING *",
                (status, appointment_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    # ── Patient history ───────────────────────────────────────────

    def create_patient_history(self, patient_id: str, record: dict) -> str:
        with self.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO patient_history (patient_id, visit_date, diagnosis, medications, notes)
                   VALUES (%s, %s, %s, %s, %s) RETURNING id""",
                (patient_id, record["visit_date"], record["diagnosis"],
                 record["medications"], record["notes"]),
            )
            return str(cur.fetchone()["id"])

    def get_patient_history(self, patient_id: str) -> list:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM patient_history WHERE patient_id = %s ORDER BY visit_date DESC",
                (patient_id,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ── Call logs ─────────────────────────────────────────────────

    def create_call_log(self, appointment_id: str, patient_id: str, vapi_call_id: str = None) -> str:
        with self.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO call_logs (appointment_id, patient_id, vapi_call_id)
                   VALUES (%s, %s, %s) RETURNING id""",
                (appointment_id, patient_id, vapi_call_id),
            )
            return str(cur.fetchone()["id"])

    def update_call_log(self, vapi_call_id: str, transcript: str, status: str) -> dict:
        with self.conn.cursor() as cur:
            cur.execute(
                """UPDATE call_logs
                   SET transcript = %s, call_status = %s, ended_at = NOW()
                   WHERE vapi_call_id = %s
                   RETURNING *""",
                (transcript, status, vapi_call_id),
            )
            return dict(cur.fetchone())

    def get_call_log(self, call_log_id: str) -> dict | None:
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM call_logs WHERE id = %s", (call_log_id,))
            row = cur.fetchone()
            return dict(row) if row else None

    def set_vapi_call_id(self, call_log_id: str, vapi_call_id: str) -> dict | None:
        with self.conn.cursor() as cur:
            cur.execute(
                "UPDATE call_logs SET vapi_call_id = %s WHERE id = %s RETURNING *",
                (vapi_call_id, call_log_id),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def update_call_log_by_id(self, call_log_id: str, transcript: str, status: str) -> dict:
        with self.conn.cursor() as cur:
            cur.execute(
                """UPDATE call_logs
                   SET transcript = %s, call_status = %s, ended_at = NOW()
                   WHERE id = %s
                   RETURNING *""",
                (transcript, status, call_log_id),
            )
            return dict(cur.fetchone())

    # ── Pre-visit summaries ───────────────────────────────────────

    def save_pre_visit_summary(self, call_log_id: str, summary) -> str:
        with self.conn.cursor() as cur:
            # fetch appointment_id from call_log
            cur.execute("SELECT appointment_id FROM call_logs WHERE id = %s", (call_log_id,))
            appointment_id = cur.fetchone()["appointment_id"]

            import json
            cur.execute(
                """INSERT INTO pre_visit_summaries
                   (call_log_id, appointment_id, appointment_confirmed, current_symptoms,
                    current_medications, fasting_compliant, urgent_flags,
                    patient_questions, recommended_actions, raw_extraction)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING id""",
                (
                    call_log_id, appointment_id,
                    summary.appointment_confirmed,
                    summary.current_symptoms,
                    summary.current_medications,
                    summary.fasting_compliant,
                    summary.urgent_flags,
                    summary.patient_questions,
                    summary.recommended_actions,
                    json.dumps(summary.dict()),
                ),
            )
            return str(cur.fetchone()["id"])

    def get_summary_by_call_log(self, call_log_id: str) -> dict | None:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM pre_visit_summaries WHERE call_log_id = %s",
                (call_log_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    # ── Reflexion ─────────────────────────────────────────────────

    def save_reflexion(self, call_log_id: str, reflexion: dict) -> str:
        with self.conn.cursor() as cur:
            cur.execute(
                """INSERT INTO reflexion_memory
                   (call_log_id, critique, what_went_wrong, what_to_do_differently,
                    key_learning, overall_score)
                   VALUES (%s, %s, %s, %s, %s, %s)
                   RETURNING id""",
                (
                    call_log_id,
                    reflexion.get("critique", ""),
                    reflexion.get("what_went_wrong", ""),
                    reflexion.get("what_to_do_differently", ""),
                    reflexion.get("key_learning", ""),
                    reflexion.get("overall_score", 0),
                ),
            )
            return str(cur.fetchone()["id"])

    def get_reflexion_by_call_log(self, call_log_id: str) -> dict | None:
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM reflexion_memory WHERE call_log_id = %s",
                (call_log_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None

    def fetch_recent_reflexions(self, limit: int = 3) -> list:
        with self.conn.cursor() as cur:
            cur.execute(
                """SELECT key_learning, overall_score
                   FROM reflexion_memory
                   ORDER BY created_at DESC
                   LIMIT %s""",
                (limit,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ── Dashboard ─────────────────────────────────────────────────

    def get_summaries_for_date(self, date: str) -> list:
        with self.conn.cursor() as cur:
            cur.execute(
                """SELECT pvs.*, p.name as patient_name, a.appointment_time, a.doctor_name
                   FROM pre_visit_summaries pvs
                   JOIN call_logs cl ON pvs.call_log_id = cl.id
                   JOIN appointments a ON pvs.appointment_id = a.id
                   JOIN patients p ON cl.patient_id = p.id
                   WHERE DATE(a.appointment_time) = %s
                   ORDER BY a.appointment_time""",
                (date,),
            )
            return [dict(r) for r in cur.fetchall()]

    # ── All appointments (for seeding verification) ───────────────

    def get_all_appointments(self) -> list:
        with self.conn.cursor() as cur:
            cur.execute(
                """SELECT a.*, p.name as patient_name
                   FROM appointments a JOIN patients p ON a.patient_id = p.id
                   ORDER BY a.created_at DESC""",
            )
            return [dict(r) for r in cur.fetchall()]
