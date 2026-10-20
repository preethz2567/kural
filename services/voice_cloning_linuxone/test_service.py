"""
Kural Voice Cloning Microservice Diagnostic Test
================================================
Verifies that the LinuxONE voice cloning service is alive and responding:
1. Tests GET /health
2. Tests POST /v1/clone-voice
3. Tests POST /v1/synthesize-speech
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"

def test_health():
    url = f"{BASE_URL}/health"
    print(f"[1/3] Testing GET {url}...")
    try:
        with urllib.request.urlopen(url, timeout=5.0) as resp:
            data = json.loads(resp.read().decode())
            print(f"      ✓ Health OK: status={data.get('status')}, arch={data.get('architecture')}, engine={data.get('engine')}")
            return True
    except Exception as e:
        print(f"      ✗ Health check failed: {e}")
        return False

def test_clone_voice():
    url = f"{BASE_URL}/v1/clone-voice"
    print(f"[2/3] Testing POST {url}...")
    # Minimal 1-sec PCM WAV header in base64
    dummy_wav_b64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
    payload = {
        "patient_id": "test_patient",
        "speaker_name": "Meera",
        "audio_base64": dummy_wav_b64,
        "language": "en"
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode())
            print(f"      ✓ Voice Clone Enrollment OK: voice_id={data.get('voice_id')}")
            return True
    except Exception as e:
        print(f"      ✗ Voice clone failed: {e}")
        return False

def test_synthesize_speech():
    url = f"{BASE_URL}/v1/synthesize-speech"
    print(f"[3/3] Testing POST {url}...")
    payload = {
        "voice_id": "voice_test_patient_meera",
        "text": "Hello Amma, I am right here with you.",
        "language": "en",
        "speed": 0.92
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=8.0) as resp:
            data = json.loads(resp.read().decode())
            b64_len = len(data.get("audio_base64", ""))
            print(f"      ✓ Speech Synthesis OK: content_type={data.get('content_type')}, audio_len={b64_len} bytes")
            return b64_len > 100
    except Exception as e:
        print(f"      ✗ Speech synthesis failed: {e}")
        return False

if __name__ == "__main__":
    print(f"Testing Kural Voice Cloning Microservice at {BASE_URL}...\n")
    ok1 = test_health()
    ok2 = test_clone_voice()
    ok3 = test_synthesize_speech()
    
    print("\n--------------------------------------------------------------")
    if ok1 and ok2 and ok3:
        print("  ✓ ALL 3 ENDPOINTS OPERATIONAL AND READY!")
    else:
        print("  ✗ SOME TESTS FAILED. CHECK LOGS ABOVE.")
    print("--------------------------------------------------------------")
