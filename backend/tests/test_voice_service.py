"""
test_voice_service.py
=====================
Tests for the voice cloning service, voice store, and speech synthesis endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from main import app
from store import voice_store
from services import voice_service

@pytest.fixture()
def client():
    return TestClient(app)

def test_get_voice_profile_defaults(client):
    res = client.get("/voice/patient_kalyani")
    assert res.status_code == 200
    data = res.json()
    assert data["speaker_name"] == "Meera"
    assert data["status"] == "ready"
    assert "xtts-v2" in data["model"]

def test_clone_voice_endpoint_success(client):
    payload = {
        "speaker_name": "Meera",
        "audio_base64": "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
        "relation": "daughter",
        "language": "ta-IN",
        "cadence_preset": "maternal"
    }
    res = client.post("/voice/clone/patient_kalyani", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "Meera" in data["message"]
    assert data["profile"]["speaker_name"] == "Meera"

def test_clone_voice_endpoint_empty_sample_fails(client):
    payload = {
        "speaker_name": "Meera",
        "audio_base64": "",
    }
    res = client.post("/voice/clone/patient_kalyani", json=payload)
    assert res.status_code == 400

def test_synthesize_speech_endpoint(client):
    payload = {
        "patient_id": "patient_kalyani",
        "text": "Hello Amma, you are safe and warm at home with us.",
        "language": "en-US"
    }
    res = client.post("/voice/synthesize", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["voice_cloned"] is True
    assert "audio_base64" in data
    assert len(data["audio_base64"]) > 50
    assert data["content_type"] in ("audio/mpeg", "audio/mp3", "audio/wav", "audio/webm")
    assert data["speaker_name"] == "Meera"

def test_chat_returns_cloned_voice_audio(client):
    res = client.post(
        "/chat/patient_001",
        json={"session_id": "test_voice_auto_play", "message": "Good morning!"}
    )
    assert res.status_code == 200
    data = res.json()
    assert "audio" in data
    assert data["audio"] is not None
    assert data["audio"]["voice_cloned"] is True
    assert "audio_base64" in data["audio"]
