import os
import chromadb
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_openai = OpenAI()
_chroma = chromadb.PersistentClient(path=os.environ.get("CHROMA_PATH", "./chroma_db"))
_collection = _chroma.get_or_create_collection("patient_history")


def _embed(text: str) -> list[float]:
    response = _openai.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def index_patient_history(patient_id: str, history_records: list[dict]):
    for record in history_records:
        text = (
            f"Visit: {record['visit_date']}\n"
            f"Diagnosis: {record['diagnosis']}\n"
            f"Medications: {', '.join(record['medications'])}\n"
            f"Notes: {record['notes']}"
        )
        _collection.upsert(
            ids=[f"{patient_id}_{record['visit_date']}"],
            embeddings=[_embed(text)],
            documents=[text],
            metadatas=[{"patient_id": str(patient_id)}],
        )


def get_patient_context(patient_id: str, query: str = "recent visit history medications diagnosis") -> str:
    results = _collection.query(
        query_embeddings=[_embed(query)],
        where={"patient_id": str(patient_id)},
        n_results=3,
    )
    docs = results["documents"][0] if results["documents"] else []
    if not docs:
        return "No previous visit history found."
    return "\n\n".join(docs)
