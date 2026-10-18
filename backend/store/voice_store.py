import json
from pathlib import Path
from typing import Dict, Any, Optional

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "voices"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# In-memory store initialized with default caregiver voice profiles
_voice_profiles: Dict[str, Dict[str, Any]] = {
    "patient_kalyani": {
        "voice_id": "voice_kalyani_meera",
        "speaker_name": "Meera",
        "relation": "daughter",
        "model": "xtts-v2-linuxone",
        "status": "ready",
        "language": "ta-IN",
        "sample_duration_sec": 14.5,
        "cadence_preset": "maternal",
        "speed": 0.92,
        "pitch": 1.05,
        "created_at": "2026-10-18T10:00:00Z",
    },
    "patient_001": {
        "voice_id": "voice_nell_clara",
        "speaker_name": "Clara",
        "relation": "daughter",
        "model": "xtts-v2-linuxone",
        "status": "ready",
        "language": "en-US",
        "sample_duration_sec": 12.0,
        "cadence_preset": "reassurance",
        "speed": 0.90,
        "pitch": 1.02,
        "created_at": "2026-10-18T10:00:00Z",
    },
}

def get_voice_profile(patient_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve the active voice clone profile for a patient."""
    return _voice_profiles.get(patient_id)

def save_voice_profile(patient_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """Save or update a cloned voice profile for a patient."""
    existing = _voice_profiles.get(patient_id, {})
    updated = {**existing, **profile_data, "patient_id": patient_id}
    _voice_profiles[patient_id] = updated
    
    # Save to JSON file
    file_path = DATA_DIR / f"{patient_id}_voice.json"
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(updated, f, indent=2)
    except Exception as e:
        print(f"[Voice Store] Warning: Failed to persist to file {file_path}: {e}")
        
    return updated

def delete_voice_profile(patient_id: str) -> bool:
    """Remove a voice profile."""
    if patient_id in _voice_profiles:
        del _voice_profiles[patient_id]
        file_path = DATA_DIR / f"{patient_id}_voice.json"
        if file_path.exists():
            file_path.unlink()
        return True
    return False
