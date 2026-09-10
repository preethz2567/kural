from fastapi import APIRouter, HTTPException
from models.patient import Patient
from store import patient_store

router = APIRouter(prefix="/patient", tags=["patient"])

@router.get("/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str):
    patient = patient_store.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@router.put("/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, patient_update: Patient):
    if patient_id != patient_update.patient_id:
        raise HTTPException(status_code=400, detail="Patient ID in path does not match body")
    
    # Check if exists first to return proper status, though PUT can be used for creation.
    # We will assume it updates or creates.
    patient_store.save_patient(patient_update)
    return patient_update
