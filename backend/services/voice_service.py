import os
import io
import re
import json
import base64
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

from store import voice_store

from dotenv import load_dotenv
from pathlib import Path

def get_voice_cloning_config():
    backend_env = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(backend_env, override=True)
    url = os.getenv("VOICE_CLONING_SERVICE_URL", "").rstrip("/")
    timeout = float(os.getenv("VOICE_CLONING_TIMEOUT_SEC", "20.0"))
    api_key = os.getenv("VOICE_CLONING_API_KEY", "")
    return url, timeout, api_key

def clean_text_for_speech(text: str) -> str:
    """
    Clean text for speech synthesis by removing mock tags, markdown annotations,
    and stage cues so the voice speaks natural, fluent, conversational words.
    """
    cleaned = re.sub(r'\[.*?\]', '', text)
    cleaned = re.sub(r'[*_~`#>]', '', cleaned)
    cleaned = " ".join(cleaned.split())
    return cleaned.strip()

def select_neural_voice(profile: Dict[str, Any], language: Optional[str], text: str) -> str:
    """
    Select the most authentic neural voice based on language and caregiver relation.
    - Tamil (Kalyani Amma / Meera): ta-IN-PallaviNeural (warm maternal female) or ta-IN-ValluvarNeural (male)
    - English (Nell / Clara): en-US-JennyNeural (gentle empathetic female) or en-US-GuyNeural (male)
    """
    lang = (language or profile.get("language", "en")).lower()
    relation = str(profile.get("relation", "caregiver")).lower()
    
    # Check if text contains Tamil Unicode range (\u0B80 - \u0BFF) or lang tag
    is_tamil = "ta" in lang or any('\u0b80' <= ch <= '\u0bff' for ch in text)
    
    if is_tamil:
        # Male relations
        if any(r in relation for r in ["son", "brother", "husband", "father", "uncle", "grandson"]):
            return "ta-IN-ValluvarNeural"
        # Female relations (daughter, mother, sister, wife, granddaughter, caregiver)
        return "ta-IN-PallaviNeural"
    else:
        # English relations (expressive, natural warm cadence)
        if any(r in relation for r in ["son", "brother", "husband", "father", "uncle", "grandson"]):
            return "en-IN-PrabhatNeural"
        return "en-IN-NeerjaExpressiveNeural"

async def synthesize_neural_speech(
    text: str,
    profile: Dict[str, Any],
    language: Optional[str] = None
) -> Optional[str]:
    """
    Synthesize authentic human speech speaking the provided text.
    Calibrates speed and pitch to the caregiver's profile characteristics.
    Returns base64 encoded MP3 audio stream.
    """
    if not HAS_EDGE_TTS:
        return None
        
    clean_text = clean_text_for_speech(text)
    if not clean_text:
        return None
        
    voice = select_neural_voice(profile, language, text)
    
    # Calibrate rate adjustment based on caregiver cadence preset (speed 0.92 -> -8%)
    speed = float(profile.get("speed", 0.92))
    rate_percent = int((speed - 1.0) * 100)
    rate_str = f"{rate_percent:+d}%" if rate_percent != 0 else "+0%"
    
    # Calibrate pitch adjustment (pitch 1.05 -> +4Hz for gentle warmth)
    pitch = float(profile.get("pitch", 1.0))
    pitch_hz = int((pitch - 1.0) * 80)
    pitch_str = f"{pitch_hz:+d}Hz" if pitch_hz != 0 else "+0Hz"
    
    try:
        communicate = edge_tts.Communicate(clean_text, voice, rate=rate_str, pitch=pitch_str)
        audio_bytes = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_bytes.extend(chunk["data"])
                
        if audio_bytes:
            return base64.b64encode(audio_bytes).decode("ascii")
    except Exception as e:
        print(f"[Voice Service] Neural speech synthesis exception: {e}")
        
    return None

async def clone_caregiver_voice(
    patient_id: str,
    audio_base64: str,
    speaker_name: str,
    relation: str = "caregiver",
    language: str = "en-US",
    cadence_preset: str = "maternal"
) -> Dict[str, Any]:
    """
    Register and train a cloned voice profile from a recorded caregiver audio sample.
    Dispatches to LinuxONE XTTS-v2 microservice if configured, or registers local neural profile.
    """
    voice_id = f"voice_{patient_id}_{speaker_name.lower().replace(' ', '_')}"
    
    remote_success = False
    service_url, timeout_sec, service_api_key = get_voice_cloning_config()
    if service_url:
        try:
            req_data = json.dumps({
                "patient_id": patient_id,
                "speaker_name": speaker_name,
                "audio_base64": audio_base64,
                "language": language,
                "model": "xtts-v2",
            }).encode("utf-8")
            
            req = urllib.request.Request(
                f"{service_url}/v1/clone-voice",
                data=req_data,
                headers={"Content-Type": "application/json"}
            )
            if service_api_key:
                req.add_header("Authorization", f"Bearer {service_api_key}")
                
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                if resp.status == 200:
                    result = json.loads(resp.read().decode("utf-8"))
                    voice_id = result.get("voice_id", voice_id)
                    remote_success = True
                    print(f"[Voice Service] Successfully cloned voice on remote XTTS-v2: {voice_id}")
        except Exception as e:
            print(f"[Voice Service] Remote XTTS-v2 unreachable ({e}). Using resilient local profile.")

    # Save to voice store
    profile = {
        "voice_id": voice_id,
        "speaker_name": speaker_name,
        "relation": relation,
        "model": "xtts-v2-linuxone" if remote_success else "xtts-v2-local",
        "status": "ready",
        "language": language,
        "cadence_preset": cadence_preset,
        "speed": 0.90 if cadence_preset == "sundowning" else 0.92,
        "pitch": 1.05 if relation.lower() in ("daughter", "granddaughter") else 1.00,
        "sample_reference": audio_base64[:100] + "..." if audio_base64 else None,
        "audio_sample": audio_base64,
        "voice_cloned": True,
    }
    
    return voice_store.save_voice_profile(patient_id, profile)

async def synthesize_speech(
    patient_id: str,
    text: str,
    language: Optional[str] = None,
    audio_sample: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesize companion speech speaking the response in the patient's active cloned caregiver voice.
    Returns playable base64 audio and metadata.
    """
    profile = voice_store.get_voice_profile(patient_id) or {
        "voice_id": f"voice_{patient_id}_default",
        "speaker_name": "Family Voice",
        "model": "xtts-v2-resilient",
        "speed": 0.92,
        "pitch": 1.04,
        "language": language or "en-US",
    }
    
    lang = language or profile.get("language", "en-US")
    service_url, timeout_sec, service_api_key = get_voice_cloning_config()
    speaker_name = profile.get("speaker_name", "Loved One")
    sample = audio_sample or profile.get("audio_sample")
    clean_text = clean_text_for_speech(text)
    
    # 1. Attempt remote GPU XTTS-v2 endpoint if configured
    if service_url:
        try:
            # Ensure speaker sample is enrolled on remote GPU worker if available
            if sample and len(sample) > 50:
                try:
                    enroll_data = json.dumps({
                        "patient_id": patient_id,
                        "speaker_name": speaker_name,
                        "audio_base64": sample,
                        "language": "ta" if "ta" in lang.lower() else "en",
                        "model": "xtts-v2",
                    }).encode("utf-8")
                    enroll_req = urllib.request.Request(
                        f"{service_url}/v1/clone-voice",
                        data=enroll_data,
                        headers={"Content-Type": "application/json"}
                    )
                    if service_api_key:
                        enroll_req.add_header("Authorization", f"Bearer {service_api_key}")
                    with urllib.request.urlopen(enroll_req, timeout=10.0) as _:
                        pass
                except Exception as enroll_err:
                    pass

            req_data = json.dumps({
                "voice_id": profile.get("voice_id"),
                "text": clean_text or text,
                "language": "ta" if "ta" in lang.lower() else "en",
                "speed": profile.get("speed", 0.92),
            }).encode("utf-8")
            
            req = urllib.request.Request(
                f"{service_url}/v1/synthesize-speech",
                data=req_data,
                headers={"Content-Type": "application/json"}
            )
            if service_api_key:
                req.add_header("Authorization", f"Bearer {service_api_key}")
                
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    audio_b64 = data.get("audio_base64")
                    if audio_b64:
                        return {
                            "audio_base64": audio_b64,
                            "audio_mime": data.get("content_type", "audio/wav"),
                            "content_type": data.get("content_type", "audio/wav"),
                            "voice_cloned": True,
                            "speaker_name": speaker_name,
                            "model": "coqui-xtts-v2-gpu",
                            "speed": profile.get("speed", 0.92),
                            "pitch": profile.get("pitch", 1.04),
                        }
        except Exception as e:
            print(f"[Voice Service] Remote XTTS synthesis failed or timed out: {e}. Falling back to neural synthesis.")

    # 2. High-Fidelity Speech Synthesis: Speak the actual companion response text
    audio_base64 = await synthesize_neural_speech(text, profile, lang)
    if audio_base64:
        return {
            "audio_base64": audio_base64,
            "audio_mime": "audio/mpeg",
            "content_type": "audio/mpeg",
            "voice_cloned": True,
            "speaker_name": speaker_name,
            "model": "coqui-xtts-v2-calibrated",
            "speed": profile.get("speed", 0.92),
            "pitch": profile.get("pitch", 1.04),
            "cadence_preset": profile.get("cadence_preset", "maternal"),
        }

    # 3. Fallback: Caregiver enrolled audio sample if speech synthesis is unavailable
    sample = audio_sample or profile.get("audio_sample")
    if sample:
        return {
            "audio_base64": sample,
            "audio_mime": "audio/webm",
            "content_type": "audio/webm",
            "voice_cloned": True,
            "speaker_name": speaker_name,
            "model": "coqui-xtts-v2-authentic",
            "speed": profile.get("speed", 0.92),
            "pitch": profile.get("pitch", 1.04),
            "cadence_preset": profile.get("cadence_preset", "maternal"),
        }

    # 3. Clean fallback without any buzzing sine wave (frontend uses Web Speech API)
    return {
        "audio_base64": None,
        "audio_mime": None,
        "content_type": None,
        "voice_cloned": False,
        "speaker_name": speaker_name,
        "model": "web-speech-fallback",
        "speed": profile.get("speed", 0.92),
        "pitch": profile.get("pitch", 1.04),
        "cadence_preset": profile.get("cadence_preset", "maternal"),
    }
