import os
import requests
from dotenv import load_dotenv

load_dotenv()

VAPI_BASE_URL = "https://api.vapi.ai"
VAPI_API_KEY = os.environ.get("VAPI_API_KEY", "")
VAPI_PUBLIC_KEY = os.environ.get("VAPI_PUBLIC_KEY", "")
VAPI_PHONE_NUMBER_ID = os.environ.get("VAPI_PHONE_NUMBER_ID", "")
VAPI_WEBHOOK_SECRET = os.environ.get("VAPI_WEBHOOK_SECRET", "")
WEBHOOK_BASE_URL = os.environ.get("WEBHOOK_BASE_URL", "")  # e.g. https://abc123.ngrok-free.app

ASSISTANT_CONFIG = {
    "name": "PreVisit Agent",
    "model": {
        "provider": "openai",
        "model": "gpt-4o",
        "messages": [],  # filled dynamically with system prompt
    },
    "voice": {
        "provider": "11labs",
        "voiceId": "N2al4jd45e882svx17SU",  # "Aakash Aryan" — standard North Indian Hindi, tagged for customer-care calls
        "model": "eleven_multilingual_v2",
    },
    "firstMessage": "Hello, {patient_name} ji, main Bhopal Institute of Gastroenterology se bol raha hoon. Kal ki appointment confirm karne ke liye call kiya tha.",
    "endCallMessage": "Theek hai, dhanyavaad. Kal milte hain. Koi bhi sawaal ho toh humein zaroor call kijiye.",
    "transcriber": {
        "provider": "deepgram",
        # "multi" (code-switch) mode has a confirmed open bug where it misidentifies Hindi as
        # Spanish (Deepgram staff, github.com/orgs/deepgram/discussions/1208) — no fix available yet.
        # Hindi-primary mode still tolerates common English loanwords reasonably well.
        "language": "hi",
        "model": "nova-3",
        "endpointing": 300,  # default (10ms) is latency-optimized and drops/fragments short utterances — Vapi's own docs recommend 300 for accuracy
        "smartFormat": True,
    },
}


def _build_assistant_config(patient_name: str, system_prompt: str) -> dict:
    config = {**ASSISTANT_CONFIG}
    config["model"] = {
        **ASSISTANT_CONFIG["model"],
        "messages": [{"role": "system", "content": system_prompt}],
    }
    config["firstMessage"] = config["firstMessage"].format(patient_name=patient_name)

    # Tell Vapi where to POST the end-of-call-report (and the shared secret to prove it's them)
    if WEBHOOK_BASE_URL:
        config["server"] = {
            "url": f"{WEBHOOK_BASE_URL.rstrip('/')}/webhook/vapi",
        }
        if VAPI_WEBHOOK_SECRET:
            config["server"]["secret"] = VAPI_WEBHOOK_SECRET

    return config


def trigger_call(patient_phone: str, patient_name: str, system_prompt: str) -> dict:
    config = _build_assistant_config(patient_name, system_prompt)

    response = requests.post(
        f"{VAPI_BASE_URL}/call",
        headers={"Authorization": f"Bearer {VAPI_API_KEY}"},
        json={
            "phoneNumberId": VAPI_PHONE_NUMBER_ID,
            "customer": {
                "number": patient_phone,
                "name": patient_name,
            },
            "assistant": config,
        },
        timeout=15,
    )
    if not response.ok:
        # Surface Vapi's actual validation error instead of a bare 400
        raise RuntimeError(f"Vapi {response.status_code}: {response.text}")
    return response.json()


def build_web_call_config(patient_name: str, system_prompt: str) -> dict:
    """
    Assistant config for a browser-based Vapi Web SDK call (WebRTC, no phone
    number). The frontend passes this straight to `vapi.start(config)` along
    with the public key.
    """
    return _build_assistant_config(patient_name, system_prompt)
