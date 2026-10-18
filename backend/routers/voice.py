from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from store import voice_store, patient_store
from services import voice_service

router = APIRouter(prefix="/voice", tags=["voice"])

class VoiceCloneRequest(BaseModel):
    speaker_name: str
    audio_base64: str
    relation: Optional[str] = "caregiver"
    language: Optional[str] = "en-US"
    cadence_preset: Optional[str] = "maternal"

class VoiceSynthesizeRequest(BaseModel):
    patient_id: str
    text: str
    language: Optional[str] = None
    audio_sample: Optional[str] = None

@router.get("/{patient_id}")
async def get_patient_voice_profile(patient_id: str):
    """Retrieve the active cloned voice profile for a patient."""
    profile = voice_store.get_voice_profile(patient_id)
    if not profile:
        # Return default profile with ready status
        patient = patient_store.get_patient(patient_id)
        preferred = patient.preferred_name or patient.name if patient else "Loved One"
        return {
            "voice_id": f"voice_{patient_id}_default",
            "speaker_name": "Family Voice",
            "relation": "caregiver",
            "status": "ready",
            "model": "xtts-v2-linuxone",
            "language": "en-US",
            "cadence_preset": "maternal",
            "speed": 0.92,
            "pitch": 1.05,
        }
    return profile

@router.post("/clone/{patient_id}")
async def clone_voice_for_patient(patient_id: str, request: VoiceCloneRequest):
    """
    Train or register a caregiver's cloned voice profile using a recorded audio sample.
    """
    if not request.audio_base64 or len(request.audio_base64) < 20:
        raise HTTPException(status_code=400, detail="Invalid or empty audio sample provided.")
        
    profile = await voice_service.clone_caregiver_voice(
        patient_id=patient_id,
        audio_base64=request.audio_base64,
        speaker_name=request.speaker_name,
        relation=request.relation or "caregiver",
        language=request.language or "en-US",
        cadence_preset=request.cadence_preset or "maternal",
    )
    return {
        "status": "success",
        "message": f"Voice cloned successfully for {request.speaker_name} using XTTS-v2.",
        "profile": profile,
    }

@router.post("/synthesize")
async def synthesize_speech_endpoint(request: VoiceSynthesizeRequest):
    """
    Synthesize speech in the cloned voice of the patient's caregiver.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
        
    result = await voice_service.synthesize_speech(
        patient_id=request.patient_id,
        text=request.text,
        language=request.language,
        audio_sample=request.audio_sample,
    )
    return result
