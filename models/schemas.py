from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PatientCreate(BaseModel):
    name: str
    phone: str
    age: Optional[int] = None
    language_preference: str = "hinglish"


class Patient(PatientCreate):
    id: str
    created_at: Optional[datetime] = None


class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_name: str
    appointment_time: datetime
    department: str = "gastroenterology"
    procedure_type: Optional[str] = None
    requires_fasting: bool = False


class Appointment(AppointmentCreate):
    id: str
    status: str = "scheduled"
    created_at: Optional[datetime] = None


class AppointmentWithPatient(Appointment):
    patient_name: str


class CallLog(BaseModel):
    id: str
    appointment_id: str
    patient_id: str
    vapi_call_id: Optional[str] = None
    transcript: Optional[str] = None
    call_status: str = "pending"
    duration_seconds: Optional[int] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
