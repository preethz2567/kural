# Kural Voice Cloning Microservice — LinuxONE Integration Architecture

**Target Architecture:** IBM LinuxONE (s390x) / Enterprise Linux  
**Underlying Open-Source Model:** Coqui XTTS-v2 / F5-TTS (Few-Shot Voice Cloning)  
**Status:** In Active Deployment  
**Current Active Fallback:** Calibrated Neural Harmonic Acoustic Synthesizer (`backend/services/voice_service.py`)

---

## 1. Architectural Overview

In Kural, voice cloning enables the companion to speak in the exact authentic voice, tone, and prosody of the elder's primary caregiver or family member (e.g., their daughter Meera), creating profound emotional grounding for patients with Alzheimer's and dementia.

```
                  ┌────────────────────────────────────────────────┐
                  │                FastAPI Backend                 │
                  │   POST /chat/{patient_id}                      │
                  │   POST /voice/clone/{patient_id}               │
                  │   POST /voice/synthesize                       │
                  └───────────────────────┬────────────────────────┘
                                          │
                     ┌────────────────────┴───────────────────┐
                     ▼                                        ▼
      [LinuxONE Voice Cloning Service]            [Resilient Local Fallback]
  ┌───────────────────────────────────────┐      ┌───────────────────────────────┐
  │ Host: IBM LinuxONE (s390x)            │      │ Zero-Dependency Fallback      │
  │ Model: Coqui XTTS-v2 / F5-TTS         │      │ Calibrated Acoustic Waveform  │
  │ Protocol: REST HTTP JSON / Audio WAV  │      │ & Formant Prosody Synthesis   │
  │ Latency: < 1.2s for 2-sentence turns │      └───────────────────────────────┘
  └───────────────────────────────────────┘
```

---

## 2. Environment Variables

The FastAPI backend discovers the LinuxONE voice cloning service via:

| Variable | Type | Default | Description |
|---|---|---|---|
| `VOICE_CLONING_SERVICE_URL` | string | `""` (empty = fallback) | Base URL of the XTTS-v2 service on LinuxONE (e.g. `http://linuxone.kural-voice.internal:8000`) |
| `VOICE_CLONING_TIMEOUT_SEC` | float | `2.5` | Max latency allowance before failing over cleanly to the local audio engine |
| `VOICE_CLONING_API_KEY` | string | `""` | Bearer authorization token for secure LinuxONE microservice calls |

---

## 3. Microservice REST Contract

### Endpoint 1: Voice Enrollment (`POST /v1/clone-voice`)

Registers a caregiver's 10–30 second audio sample to extract speaker conditioning latents.

#### Request (JSON)
```json
{
  "patient_id": "patient_kalyani",
  "speaker_name": "Meera",
  "audio_base64": "<base64_encoded_wav_or_webm>",
  "language": "ta-IN",
  "model": "xtts-v2"
}
```

#### Response (JSON)
```json
{
  "status": "ready",
  "voice_id": "voice_patient_kalyani_meera",
  "speaker_name": "Meera",
  "sample_duration_sec": 14.5,
  "embedding_size": 512,
  "model_version": "coqui-xtts-v2-linuxone-s390x"
}
```

---

### Endpoint 2: Speech Synthesis (`POST /v1/synthesize-speech`)

Synthesizes audio for a companion response using the enrolled speaker latent.

#### Request (JSON)
```json
{
  "voice_id": "voice_patient_kalyani_meera",
  "text": "வணக்கம் அம்மா, நான் உங்களுடன்தான் இருக்கிறேன். பயப்பட வேண்டாம்.",
  "language": "ta",
  "speed": 0.92
}
```

#### Response (JSON)
```json
{
  "status": "success",
  "content_type": "audio/wav",
  "audio_base64": "<base64_encoded_wav>",
  "duration_sec": 4.2
}
```

---

## 4. Automatic Chat Playback Contract

When a patient message is posted to `POST /chat/{patient_id}`, the response contains:
```json
{
  "response": "Hello Amma, I am right here with you. It is a lovely sunny day.",
  "distress": { "level": "none", "escalated": false },
  "audio": {
    "audio_base64": "<base64_wav_audio>",
    "content_type": "audio/wav",
    "voice_cloned": true,
    "speaker_name": "Meera",
    "speed": 0.92,
    "pitch": 1.05
  }
}
```
The frontend automatically plays this audio stream immediately upon receipt, eliminating manual "Listen" clicks.

---

## 5. LinuxONE (s390x) Deployment Quickstart

```dockerfile
# Containerfile for IBM LinuxONE (s390x)
FROM ibmcom/ibm-semeru-runtimes:open-21-jre-ubi9-minimal AS base
FROM python:3.11-slim

WORKDIR /app
RUN apt-get update && apt-get install -y ffmpeg libsndfile1 gcc g++ && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir TTS fastapi uvicorn soundfile

COPY . /app
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```
