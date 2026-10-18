# ⌘ Kural
**குரல் • /ku-ral/**  
*noun* : Voice; speech; song; an ancient Tamil couplet of wisdom, human dignity, and compassion.

**Kural** is an AI-powered voice companion and cognitive grounding platform specifically engineered for individuals living with Alzheimer's disease and progressive dementia. In an era where conversational AI often relies on generic, synthetic voices and ungrounded interactions that disorient vulnerable elders, Kural acts as an emotional sanctuary—cloning the authentic voices of loved ones and primary caregivers while enforcing clinical communication protocols to soothe distress, ground memory lapses, and preserve personal identity.

---

## ⌘ Architecture & Technical Stack

Kural is built on a decoupled, resilient microservices architecture designed for low-latency local execution, graceful offline fallbacks, and scalable enterprise cloud deployment.

```
                                ┌──────────────────────────────────────────────────┐
                                │             Frontend Client (Vite / React)        │
                                │   - Mobile Device Viewport (iPhone-Frame)        │
                                │   - Dual-Engine Web Audio (PCM + Blob)           │
                                │   - Zero-Touch Voice Auto-Play on Response       │
                                └─────────────────────────┬────────────────────────┘
                                                          │ HTTP REST
                                                          ▼
                                ┌──────────────────────────────────────────────────┐
                                │           Core API Gateway (FastAPI)             │
                                │   - Patient Profile & Memory Anchor Store        │
                                │   - Repetition Escalation & Session Tracker      │
                                │   - Clinical Prompt Builder                      │
                                └───────┬─────────────────┬────────────────┬───────┘
                                        │                 │                │
            ┌───────────────────────────┘                 │                └───────────────────────────┐
            ▼                                             ▼                                            ▼
 ┌──────────────────────┐                     ┌──────────────────────┐                     ┌──────────────────────┐
 │    LLM Reasoning     │                     │  Distress Detection  │                     │    Voice Cloning     │
 │  Anthropic Claude    │                     │  Engine (Multi-Tier) │                     │  Coqui XTTS-v2 / F5  │
 │  3.5 Haiku (Async)   │                     │  - Heuristic Rules   │                     │  - IBM LinuxONE VM   │
 │  Dynamic .env Reload │                     │  - LinuxONE ML (s390)│                     │  - Dual PCM Fallback │
 └──────────────────────┘                     └──────────────────────┘                     └──────────────────────┘
```

### 1. Frontend Client (`frontend/`)
- **Framework**: React 19 + Vite (Single Page Application & PWA Ready)
- **Styling**: Vanilla CSS (Tailored dark mode palette with calming rose and emerald accents, glassmorphic floating badges, accessible large-typography interface designed specifically for geriatric usability)
- **Audio Engine**: Dual-layer Web Audio architecture (`AudioContext` hardware PCM decoding with HTML5 Blob fallback) featuring automated zero-touch audio playback on assistant response, interactive audio visualizer waveforms, and instant recording enrollment
- **State & Navigation**: React Router DOM v7, contextual local storage for dementia patient profiles

### 2. Core API Service (`backend/`)
- **Runtime**: Python 3.11, FastAPI, Uvicorn
- **Data Persistence**: In-memory & JSON file stores (`store/patient_store.py`, `store/session_store.py`, `store/voice_store.py`) with zero external database lock-in
- **Dementia Prompt Engine**: Dynamic, clinical-stage prompt builder (`services/prompt_builder.py`) that conditions responses based on dementia stage (early, mid, late), communication preferences, cherished memories, living relationships, and forbidden distressing topics
- **LLM Integration**: Anthropic Claude 3.5 Haiku (`claude-3-5-haiku-20241022`) via native non-blocking async client with automatic model normalization and dynamic `.env` hot-reloading. Built-in transparent Mock Companion fallback for offline/development environments

### 3. Distress & Safety Engine (`services/distress_detector.py` & `services/distress_scorer.py`)
- **Multi-Tier Assessment**: Rule-based heuristic scoring engine detecting high, medium, and low severity distress signals, combined with repetition tracking (escalating repeated confusion queries) and immediate caregiver escalation flagging
- **Remote ML Integration Contract**: Built-in discovery client for IBM LinuxONE (s390x) ML distress classifier (`ML_DISTRESS_SERVICE_URL`) with sub-1.5s non-blocking failover guarantee

### 4. Voice Cloning & Acoustic Synthesis Service (`services/voice_service.py`)
- **Voice Enrollment & Latent Conditioning**: Caregiver voice cloning pipeline conditioned on 10–30 second audio samples
- **Microservice & Fallback Strategy**:
  - **Primary**: IBM LinuxONE (s390x) / Enterprise Linux microservice hosting Coqui XTTS-v2 / F5-TTS for few-shot speech synthesis
  - **Zero-Dependency Resilient Fallback**: Built-in acoustic synthesizer generating authentic speaker playback on greeting/anchor phrases and calibrated neural synthesis (`ta-IN-PallaviNeural` / `en-US-JennyNeural`)

---

## ⎈ Core Features

- **Loved One Voice Cloning**: Caregivers record a quick audio sample; Kural extracts speaker conditioning latents, enabling the AI companion to speak in the trusted voice of a daughter, son, or spouse.
- **Zero-Touch Auto-Play Voice Playback**: Answers are automatically spoken aloud as they arrive—no complex button taps required, eliminating friction for elders with motor or cognitive impairments.
- **Stage-Calibrated Conversational AI**: System prompts dynamically morph based on dementia severity—from gentle conversation in early stages to calm, brief sensory grounding in late stages.
- **Distress Detection & Repetition Escalation**: Heuristic & ML distress detector analyzes emotional signals and repetition frequency. When high distress is sensed, Kural shifts tone to calm de-escalation and dispatches an escalation event to the caregiver portal.
- **Cherished Memory Anchors & Reminiscence Therapy**: Weaves real familial memories (weddings, hometowns, favorite music, gardening) into conversational prompts to alleviate anxiety and combat disorientation.
- **Multilingual Tamil & English Support**: Native bilingual grounding supporting Tamil (`ta-IN`) and English (`en-US`), culturally resonant with South Asian and global elder communities.
- **Caregiver Administration Portal**: Dedicated interface for loved ones to configure memory anchors, track emotional health and repetition counts, and record/enroll voice profiles.

---

## ⌗ API Endpoints Reference

### Public API (`backend/`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/patient/` | List all registered patient profiles. |
| `POST` | `/patient/` | Create a new dementia patient profile with medical & personal history. |
| `GET` | `/patient/{patient_id}` | Retrieve detailed patient profile and memory anchors. |
| `PUT` | `/patient/{patient_id}` | Update patient memory anchors, stage, or preferences. |
| `POST` | `/chat/{patient_id}` | Send a patient message. Returns Claude AI response, distress score, escalation flags, and auto-play audio payload. |
| `GET` | `/voice/{patient_id}` | Retrieve the active cloned voice profile for a patient. |
| `POST` | `/voice/clone/{patient_id}` | Enroll a caregiver's recorded audio sample to condition the voice cloning model. |
| `POST` | `/voice/synthesize` | Synthesize speech in the cloned voice for custom or anchor phrases. |

### Remote Microservices Contract (IBM LinuxONE s390x)
*(Accessed via background service discovery)*

| Method | Endpoint | Service | Description |
|---|---|---|---|
| `POST` | `/v1/clone-voice` | Voice Cloning Service | Registers speaker audio latents using Coqui XTTS-v2. |
| `POST` | `/v1/synthesize-speech` | Voice Cloning Service | Generates synthesized audio waveforms conditioned on speaker latents. |
| `POST` | `/v1/classify-distress` | ML Distress Service | Classifies patient text and conversation history using fine-tuned DistilBERT. |

---

## ⚙️ Local Setup & Deployment

### Prerequisites
- Python 3.11+
- Node.js 18+ / npm
- Anthropic API Key (Claude 3.5 Haiku)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Edit backend/.env and supply ANTHROPIC_API_KEY and ANTHROPIC_MODEL

# Start FastAPI backend (with auto-reload)
uvicorn backend.main:app --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Access the application in your browser at `http://localhost:5173`.

---

## ☁️ Cloud Deployment (Render Blueprint & Enterprise LinuxONE)

A `render.yaml` blueprint is included for 1-click full-stack deployment on Render:

1. Connect your GitHub repository to [Render](https://render.com).
2. Select **New > Blueprint** and choose `preethz2567/kural`.
3. Supply `ANTHROPIC_API_KEY` when prompted (`ANTHROPIC_MODEL` defaults to `claude-3-5-haiku-20241022`).
4. Render will automatically provision:
   - `kural-api`: Python FastAPI service hosting the chat, distress detection, and clinical prompt engine.
   - `kural-frontend`: Static web client serving the mobile-viewport responsive interface.
5. *(Optional)* Supply `VOICE_CLONING_SERVICE_URL` and `ML_DISTRESS_SERVICE_URL` to connect dedicated IBM LinuxONE microservices.

---

**Kural — Bridging the Caregiver Gap with Voice, Dignity, and Compassion.**
