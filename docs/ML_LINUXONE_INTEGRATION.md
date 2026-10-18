# Kural ML Distress Classification Service — Integration Contract
**Target Host:** IBM LinuxONE (s390x Architecture) / Microservice  
**Status:** In Development by Haripriya  
**Current Active Fallback:** Fast, deterministic rule-based keyword & repetition scoring (`backend/services/distress_detector.py`)

---

## 1. Architectural Boundary

In Kural, **distress assessment** and **companion response generation** are decoupled:
1. When a patient message is received by FastAPI (`POST /chat/{patient_id}`), the message and recent session history are first dispatched to the distress assessment engine.
2. The resulting distress score (`none`, `low`, `medium`, `high`) dynamically adapts the companion system prompt (e.g. prioritizing calming de-escalation over factual recall when distress is high).
3. If distress is `high`, an escalation record is flagged for the caregiver portal.

```
                  ┌────────────────────────────────────────┐
                  │           FastAPI Backend              │
                  │   (POST /chat/{patient_id})            │
                  └───────────────┬────────────────────────┘
                                  │
                  ┌───────────────┴────────────────────────┐
                  ▼                                        ▼
      [Distress Assessment]                     [Claude AI Response]
 ┌─────────────────────────────┐           ┌─────────────────────────────┐
 │ Priority 1: IBM LinuxONE    │           │ anthropic.AsyncAnthropic()  │
 │ ML Classifier Service       │           │ Model: claude-haiku-5-5     │
 │ (Remote HTTP REST)          │           └─────────────────────────────┘
 ├─────────────────────────────┤
 │ Fallback: Built-in          │
 │ Rule-Based Detector         │
 └─────────────────────────────┘
```

---

## 2. Environment Configuration

The FastAPI backend discovers Haripriya's ML service via the following environment variables:

| Variable | Type | Default | Description |
|---|---|---|---|
| `ML_DISTRESS_SERVICE_URL` | string | `""` (empty = fallback) | Base URL of the ML service on IBM LinuxONE (e.g., `https://linuxone.kural-ml.internal:8080`) |
| `ML_DISTRESS_TIMEOUT_SEC` | float | `1.5` | Max latency allowance before failing over to the rule-based fallback |
| `ML_DISTRESS_API_KEY` | string | `""` | Optional service-to-service bearer token for IBM LinuxONE endpoint |

---

## 3. API Contract Definition

### Endpoint
`POST /v1/classify-distress`

### Request Schema (JSON)
```json
{
  "patient_id": "patient_001",
  "current_message": "Where is my Arthur? I can't find the way home.",
  "session_id": "sess_abc123",
  "history": [
    {
      "role": "user",
      "content": "Where is Arthur?"
    },
    {
      "role": "assistant",
      "content": "Arthur is safe, Eleanor. Let's take a calm breath together."
    }
  ]
}
```

### Response Schema (JSON)
```json
{
  "level": "high",
  "confidence": 0.94,
  "detected_categories": [
    "disorientation",
    "separation_anxiety"
  ],
  "reason": "High disorientation detected regarding deceased spouse and location.",
  "model_version": "distilbert-dementia-distress-v1.0-linuxone"
}
```

### Allowed Values for `level`
- `"none"`: Conversational, peaceful, or neutral tone.
- `"low"`: Mild fatigue, seeking reassurance, or minor repeated inquiry.
- `"medium"`: Frustration, confusion, or persistent disorientation.
- `"high"`: Severe panic, fear, agitation, or acute pain signals.

---

## 4. Failure & Fallback Policy

1. **Non-Blocking Guarantee**: The dementia companion conversation must **never** hang or fail for the elder.
2. If `ML_DISTRESS_SERVICE_URL` is empty, or if the LinuxONE service times out (> 1.5s), returns HTTP 5xx, or is unreachable:
   - The FastAPI backend catches the exception cleanly.
   - It instantly evaluates the turn with `backend.services.distress_detector.score_distress()`.
   - It logs a diagnostic warning: `[ML Fallback] LinuxONE service unavailable; utilized rule-based scorer.`
   - Companion conversation continues seamlessly.
