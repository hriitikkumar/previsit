from __future__ import annotations

import hmac
import os
import sys
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# project root on path so sub-modules resolve cleanly
sys.path.insert(0, os.path.dirname(__file__))

from agents.conversation import build_system_prompt
from agents.extraction import extract_summary
from agents.reflexion import get_reflexion_notes, run_reflexion
from db.database import Database
from models.schemas import AppointmentCreate, PatientCreate
from seed_data.seed import create_test_patients
from services.rag_service import get_patient_context
from services.vapi_service import VAPI_PUBLIC_KEY, build_web_call_config, trigger_call

app = FastAPI(title="PreVisit", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Database()

VAPI_WEBHOOK_SECRET = os.environ.get("VAPI_WEBHOOK_SECRET", "")


@app.on_event("startup")
async def startup():
    db.init_schema()


# ── Helpers ───────────────────────────────────────────────────────────────────

# In-memory per-IP rate limiting for the money-costing endpoints (real OpenAI +
# Vapi calls). This is a public demo link with no auth — resets on restart,
# which is fine for a portfolio demo; would need a shared store behind >1 process.
_rate_limit_buckets: dict[str, list[float]] = {}


def _rate_limit(request: Request, scope: str, max_calls: int, window_seconds: int = 3600):
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "unknown")
    key = f"{scope}:{ip}"
    now = time.time()
    timestamps = _rate_limit_buckets.setdefault(key, [])
    timestamps[:] = [t for t in timestamps if now - t < window_seconds]
    if len(timestamps) >= max_calls:
        raise HTTPException(
            status_code=429,
            detail=f"Demo limit reached ({max_calls} per hour) — please try again later.",
        )
    timestamps.append(now)


def _verify_vapi_secret(secret_header: str | None):
    """
    Vapi echoes the assistant's `server.secret` back as the plaintext
    `x-vapi-secret` header on every webhook. Reject anything that doesn't match.
    """
    if not VAPI_WEBHOOK_SECRET:
        return  # secret not configured — skip verification (dev mode)
    if not secret_header or not hmac.compare_digest(secret_header, VAPI_WEBHOOK_SECRET):
        raise HTTPException(status_code=401, detail="Invalid or missing x-vapi-secret header")


async def _process_completed_call(call_log_id: str, transcript: str):
    """Run extraction + reflexion after a call ends. Used by both real and mock paths."""
    summary = extract_summary(transcript)
    db.save_pre_visit_summary(call_log_id, summary)

    reflexion = run_reflexion(transcript, summary.dict())
    # Partial/failed calls produce noisy, low-signal self-critiques — don't let
    # them feed into future prompts unless a doctor explicitly approves them.
    auto_approved = summary.call_quality == "complete"
    db.save_reflexion(call_log_id, reflexion, approved=auto_approved)

    print(f"[previsit] Call {call_log_id} processed — score {reflexion['overall_score']}/10 (approved={auto_approved})")
    print(f"[previsit] Key learning: {reflexion['key_learning']}")


# ── Trigger a real Vapi call ──────────────────────────────────────────────────

@app.post("/call/trigger/{appointment_id}")
async def trigger_pre_visit_call(appointment_id: str, request: Request):
    _rate_limit(request, "phone_call", max_calls=1, window_seconds=3600)

    appointment = db.get_appointment(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient = db.get_patient(appointment["patient_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient_history = get_patient_context(str(patient["id"]))
    reflexion_notes = get_reflexion_notes(db)

    system_prompt = build_system_prompt(
        patient_data=patient,
        appointment_data=appointment,
        patient_history=patient_history,
        reflexion_notes=reflexion_notes,
    )

    try:
        call_response = trigger_call(
            patient_phone=patient["phone"],
            patient_name=patient["name"],
            system_prompt=system_prompt,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    call_log_id = db.create_call_log(
        appointment_id=appointment_id,
        patient_id=str(patient["id"]),
        vapi_call_id=call_response["id"],
    )

    return {
        "status": "call_triggered",
        "vapi_call_id": call_response["id"],
        "call_log_id": call_log_id,
    }


# ── Browser-based Vapi Web SDK call (visitor plays the patient) ──────────────

@app.post("/call/web/start/{appointment_id}")
async def start_web_call(appointment_id: str, request: Request):
    """
    Returns everything the frontend needs to start a live in-browser voice
    call via Vapi's Web SDK: the public key, a fully-built assistant config
    (DSPy system prompt + RAG history + reflexion notes baked in), and a
    call_log_id to track it. The browser starts the call itself — Vapi
    generates the call id client-side, so the frontend must POST it back via
    /call-logs/{call_log_id}/link once the call starts.
    """
    _rate_limit(request, "web_call", max_calls=3, window_seconds=3600)

    if not VAPI_PUBLIC_KEY:
        raise HTTPException(status_code=400, detail="VAPI_PUBLIC_KEY not configured")

    appointment = db.get_appointment(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient = db.get_patient(appointment["patient_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient_history = get_patient_context(str(patient["id"]))
    reflexion_notes = get_reflexion_notes(db)

    system_prompt = build_system_prompt(
        patient_data=patient,
        appointment_data=appointment,
        patient_history=patient_history,
        reflexion_notes=reflexion_notes,
    )

    assistant_config = build_web_call_config(
        patient_name=patient["name"],
        system_prompt=system_prompt,
    )

    call_log_id = db.create_call_log(
        appointment_id=appointment_id,
        patient_id=str(patient["id"]),
        vapi_call_id=None,
    )

    return {
        "call_log_id": call_log_id,
        "public_key": VAPI_PUBLIC_KEY,
        "assistant_config": assistant_config,
    }


class LinkVapiCall(BaseModel):
    vapi_call_id: str


@app.post("/call-logs/{call_log_id}/link")
async def link_vapi_call(call_log_id: str, body: LinkVapiCall):
    """Attach the Vapi-generated call id (only known once the browser starts the call)."""
    call_log = db.set_vapi_call_id(call_log_id, body.vapi_call_id)
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    return call_log


@app.get("/call-logs/{call_log_id}/result")
async def get_call_result(call_log_id: str):
    """Poll after a call ends to get extraction + reflexion once the background job finishes."""
    call_log = db.get_call_log(call_log_id)
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")

    if not call_log.get("transcript"):
        return {"stage": "in_call"}

    summary = db.get_summary_by_call_log(call_log_id)
    reflexion = db.get_reflexion_by_call_log(call_log_id)
    if not summary or not reflexion:
        return {"stage": "processing", "transcript": call_log["transcript"]}

    return {
        "stage": "done",
        "transcript": call_log["transcript"],
        "summary": summary,
        "reflexion": reflexion,
    }


# ── Vapi webhook (real calls) ─────────────────────────────────────────────────

@app.post("/webhook/vapi")
async def handle_vapi_webhook(request: Request):
    _verify_vapi_secret(request.headers.get("x-vapi-secret"))

    payload = await request.json()
    message = payload.get("message", {})

    if message.get("type") != "end-of-call-report":
        return {"status": "ignored"}

    call_id = message["call"]["id"]
    transcript = message.get("transcript") or message.get("artifact", {}).get("transcript", "")

    call_log = db.update_call_log(
        vapi_call_id=call_id,
        transcript=transcript,
        status="completed",
    )

    # Awaited directly rather than fire-and-forget: on serverless hosts (Vercel),
    # the function instance can be frozen right after the response is sent, so a
    # background task isn't guaranteed to finish. Blocking here trades a few
    # seconds of latency for a guarantee the pipeline actually completes.
    await _process_completed_call(call_log_id=str(call_log["id"]), transcript=transcript)

    return {"status": "completed"}


# ── Mock endpoint — test post-call pipeline without Vapi ─────────────────────

class MockCallComplete(BaseModel):
    appointment_id: str
    transcript: str


@app.post("/mock/call-complete")
async def mock_call_complete(body: MockCallComplete, request: Request):
    """
    Submit a transcript directly and run the full post-call pipeline
    (extraction + reflexion). No Vapi needed — use this for local testing.
    """
    _rate_limit(request, "mock_call", max_calls=5, window_seconds=3600)

    appointment = db.get_appointment(body.appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    call_log_id = db.create_call_log(
        appointment_id=body.appointment_id,
        patient_id=str(appointment["patient_id"]),
        vapi_call_id=None,
    )
    db.update_call_log_by_id(
        call_log_id=call_log_id,
        transcript=body.transcript,
        status="mock_completed",
    )

    await _process_completed_call(call_log_id=call_log_id, transcript=body.transcript)

    return {
        "status": "completed",
        "call_log_id": call_log_id,
    }


# ── Preview the DSPy-generated system prompt ─────────────────────────────────

@app.get("/call/preview/{appointment_id}")
async def preview_system_prompt(appointment_id: str):
    """Returns the DSPy-generated system prompt without placing a call."""
    appointment = db.get_appointment(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    patient = db.get_patient(appointment["patient_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient_history = get_patient_context(str(patient["id"]))
    reflexion_notes = get_reflexion_notes(db)

    prompt = build_system_prompt(
        patient_data=patient,
        appointment_data=appointment,
        patient_history=patient_history,
        reflexion_notes=reflexion_notes,
    )

    return {
        "patient_name": patient["name"],
        "reflexion_notes": reflexion_notes,
        "system_prompt": prompt,
    }


# ── Patients ──────────────────────────────────────────────────────────────────

@app.get("/patients")
async def list_patients():
    return db.get_all_patients()


@app.post("/patients")
async def create_patient(body: PatientCreate):
    patient_id = db.create_patient(body.dict())
    return db.get_patient(patient_id)


# ── Appointments ──────────────────────────────────────────────────────────────

@app.get("/appointments")
async def list_appointments():
    return db.get_all_appointments()


@app.post("/appointments")
async def create_appointment(body: AppointmentCreate):
    patient = db.get_patient(body.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    appointment_id = db.create_appointment(body.dict())
    return db.get_appointment(appointment_id)


class AppointmentStatusUpdate(BaseModel):
    status: str


@app.patch("/appointments/{appointment_id}/status")
async def update_appointment_status(appointment_id: str, body: AppointmentStatusUpdate):
    appointment = db.update_appointment_status(appointment_id, body.status)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


# ── Call logs ─────────────────────────────────────────────────────────────────

@app.get("/call-logs/{call_log_id}")
async def get_call_log(call_log_id: str):
    call_log = db.get_call_log(call_log_id)
    if not call_log:
        raise HTTPException(status_code=404, detail="Call log not found")
    return call_log


# ── Reflexion lessons (what feeds future call prompts) ────────────────────────

@app.get("/reflexions")
async def list_reflexions(limit: int = 20):
    return db.get_recent_reflexions_detailed(limit=limit)


class ReflexionApprovalUpdate(BaseModel):
    approved: bool


@app.patch("/reflexions/{reflexion_id}/approval")
async def set_reflexion_approval(reflexion_id: str, body: ReflexionApprovalUpdate):
    reflexion = db.set_reflexion_approved(reflexion_id, body.approved)
    if not reflexion:
        raise HTTPException(status_code=404, detail="Reflexion not found")
    return reflexion


# ── Doctor's morning dashboard ────────────────────────────────────────────────

@app.get("/dashboard/{date}")
async def get_daily_summaries(date: str):
    summaries = db.get_summaries_for_date(date)
    return {
        "date": date,
        "total_appointments": len(summaries),
        "confirmed": sum(1 for s in summaries if s.get("appointment_confirmed")),
        "urgent_flags": [s for s in summaries if s.get("urgent_flags")],
        "summaries": summaries,
    }


# ── Seed test data ────────────────────────────────────────────────────────────

@app.post("/seed")
async def seed():
    created = create_test_patients(db)
    return {"status": "seeded", "created": created}


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}
