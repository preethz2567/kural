import os
import json
from models.patient import Patient

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def get_patient_file_path(patient_id: str) -> str:
    return os.path.join(DATA_DIR, f"{patient_id}.json")

def get_patient(patient_id: str) -> Patient:
    file_path = get_patient_file_path(patient_id)
    if not os.path.exists(file_path):
        return None
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return Patient(**data)

def list_patients() -> list[Patient]:
    os.makedirs(DATA_DIR, exist_ok=True)
    patients = []
    for fname in os.listdir(DATA_DIR):
        if fname.endswith(".json"):
            pid = fname[:-5]
            p = get_patient(pid)
            if p:
                patients.append(p)
    return patients

def save_patient(patient: Patient) -> None:
    file_path = get_patient_file_path(patient.patient_id)
    # Ensure data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(patient.model_dump(), f, indent=2)
