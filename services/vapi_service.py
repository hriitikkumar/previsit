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
        "voiceId": "21m00Tcm4TlvDq8ikWAM",  # ElevenLabs' "Rachel" voice — must be the actual voice ID, not the name
        "model": "eleven_turbo_v2_5",  # multilingual (incl. Hindi) — the default (eleven_turbo_v2) is English-only
    },
    "firstMessage": "Hello, am I speaking with {patient_name}? I'm calling from Bhopal Institute of Gastroenterology to confirm your appointment tomorrow.",
    "endCallMessage": "Thank you. See you tomorrow. Please call us if you have any questions.",
    "transcriber": {
        "provider": "deepgram",
        "language": "en",
        "model": "nova-2",
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
