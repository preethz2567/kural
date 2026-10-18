import os
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import anthropic
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from store import patient_store, session_store
from services.prompt_builder import build_system_prompt
from services.distress_detector import score_distress, handle_escalation
from services import voice_service

load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")

router = APIRouter(prefix="/chat", tags=["chat"])

# Read model identifier and API key from environment with quotes/whitespace stripped
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022").strip().strip('"').strip("'")
api_key = (os.getenv("ANTHROPIC_API_KEY") or "").strip().strip('"').strip("'") or None

# Non-blocking async Anthropic client if API key is provided; tests can monkeypatch client to None
client = anthropic.AsyncAnthropic(api_key=api_key) if api_key else None

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    distress: Optional[Dict[str, Any]] = None
    audio: Optional[Dict[str, Any]] = None

def generate_mock_response(preferred_name: str, distress_level: str) -> str:
    """
    Generate a warm, gentle, stage-appropriate mock companion response.
    Clearly labeled to indicate prototype/mock mode without claiming clinical intervention.
    """
    if distress_level == "high":
        return (
            f"[Mock Companion] I am right here with you, {preferred_name}. "
            "You are safe, and everything is calm. Let's take a slow, gentle breath together."
        )
    elif distress_level in ("medium", "low"):
        return (
            f"[Mock Companion] I hear you, {preferred_name}, and I'm listening. "
            "It is completely okay to feel this way. Would you like to tell me what's on your mind?"
        )
    else:
        return (
            f"[Mock Companion] Hello {preferred_name}, it is lovely to talk with you. "
            "I am right here keeping you company. How are you feeling today?"
        )

@router.post("/{patient_id}", response_model=ChatResponse)
async def chat_with_patient(patient_id: str, request: ChatRequest):
    patient = patient_store.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    system_prompt = build_system_prompt(patient)
    preferred_name = patient.preferred_name or patient.name

    # 1. Append user message to history first so repetition counts reflect this turn
    session_store.append_turn(request.session_id, "user", request.message)
    current_history = session_store.get_history(request.session_id)
    
    # 2. Score distress and handle escalation BEFORE branching into mock or live AI mode
    distress_result = score_distress(request.message, current_history)
    escalation_status = handle_escalation(request.session_id, distress_result)
    distress_result.update(escalation_status)
    
    # Update the turn we just appended with its distress score
    current_history[-1]["distress"] = distress_result

    # 3. If no live Anthropic client, return clearly labeled mock companion response
    if not client:
        bot_reply = generate_mock_response(preferred_name, distress_result.get("level", "none"))
        session_store.append_turn(request.session_id, "assistant", bot_reply, distress=distress_result)
        audio_payload = await voice_service.synthesize_speech(patient_id, bot_reply)
        return ChatResponse(response=bot_reply, distress=distress_result, audio=audio_payload)

    # 4. Live AI Mode
    # Shift tone dynamically if distress is high
    if distress_result["level"] == "high":
        system_prompt += "\n\n[URGENT INSTRUCTION]: The patient appears highly distressed right now. Prioritize calm, short, reassuring language over factual information. De-escalate and soothe."
    
    # Get last 10 turns for Claude context (strip distress/timestamp keys before sending to Anthropic)
    history_for_claude = current_history[-10:]
    messages = [{"role": turn["role"], "content": turn["content"]} for turn in history_for_claude]
        
    try:
        response = await client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=messages
        )
        
        # Extract text content block (some models return ThinkingBlock before TextBlock)
        bot_reply = ""
        for block in response.content:
            if hasattr(block, "text"):
                bot_reply += block.text
            elif getattr(block, "type", None) == "text":
                bot_reply += getattr(block, "text", "")

        if not bot_reply:
            bot_reply = "I am right here with you, Nell."

        session_store.append_turn(request.session_id, "assistant", bot_reply, distress=distress_result)
        audio_payload = await voice_service.synthesize_speech(patient_id, bot_reply)
        
        return ChatResponse(response=bot_reply, distress=distress_result, audio=audio_payload)
    except Exception as e:
        # Return a clear, safe API error without misrepresenting API failure as a live response
        raise HTTPException(status_code=502, detail=f"Live AI service error: {str(e)}")
