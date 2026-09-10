import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import anthropic
from store import patient_store, session_store
from services.prompt_builder import build_system_prompt
from services.distress_detector import score_distress, handle_escalation
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize Anthropic client if key is available
api_key = os.getenv("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=api_key) if api_key else None

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ChatResponse(BaseModel):
    response: str
    distress: Optional[Dict[str, Any]] = None

@router.post("/{patient_id}", response_model=ChatResponse)
async def chat_with_patient(patient_id: str, request: ChatRequest):
    patient = patient_store.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    system_prompt = build_system_prompt(patient)
    
    if not client:
        # Fallback if no API key is provided
        return ChatResponse(response=f"[Mocked response - No Anthropic Key] System prompt built successfully. Length: {len(system_prompt)}")
        
    # Append first so it's in the history for repetition counting
    session_store.append_turn(request.session_id, "user", request.message)
    current_history = session_store.get_history(request.session_id)
    
    distress_result = score_distress(request.message, current_history)
    escalation_status = handle_escalation(request.session_id, distress_result)
    distress_result.update(escalation_status)
    
    # Update the turn we just appended with its distress score
    current_history[-1]["distress"] = distress_result
    
    # Shift tone dynamically if distress is high
    if distress_result["level"] == "high":
        system_prompt += "\n\n[URGENT INSTRUCTION]: The patient appears highly distressed right now. Prioritize calm, short, reassuring language over factual information. De-escalate and soothe."
    
    # Get last 10 turns for Claude context (strip distress/timestamp keys before sending to Anthropic)
    history_for_claude = current_history[-10:]
    messages = [{"role": turn["role"], "content": turn["content"]} for turn in history_for_claude]
        
    try:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=messages
        )
        
        bot_reply = response.content[0].text
        session_store.append_turn(request.session_id, "assistant", bot_reply)
        
        return ChatResponse(response=bot_reply, distress=distress_result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
