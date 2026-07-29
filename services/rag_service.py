from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_openai = OpenAI()


def _embed(text: str) -> list[float]:
    response = _openai.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def _format_vector(embedding: list[float]) -> str:
    # pgvector accepts this bracketed text form directly via a ::vector cast —
    # psycopg2 has no native vector type, so we build the literal ourselves.
    return "[" + ",".join(str(x) for x in embedding) + "]"


def index_patient_history(db, patient_id: str, history_records: list[dict]):
    for record in history_records:
        text = (
            f"Visit: {record['visit_date']}\n"
            f"Diagnosis: {record['diagnosis']}\n"
            f"Medications: {', '.join(record['medications'])}\n"
            f"Notes: {record['notes']}"
        )
        db.upsert_patient_history_embedding(
            patient_id=patient_id,
            visit_date=record["visit_date"],
            content=text,
            embedding=_format_vector(_embed(text)),
        )


def get_patient_context(db, patient_id: str, query: str = "recent visit history medications diagnosis") -> str:
    docs = db.query_patient_history(
        patient_id=patient_id,
        query_embedding=_format_vector(_embed(query)),
        limit=3,
    )
    if not docs:
        return "No previous visit history found."
    return "\n\n".join(docs)
