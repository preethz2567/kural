import re
from typing import List, Dict
from services.distress_scorer import DISTRESS_KEYWORDS

def score_distress(message: str, session_history: List[Dict[str, str]]) -> dict:
    """
    Evaluates distress level using a transparent, rule-based heuristic.
    Returns: {"level": "none"|"low"|"medium"|"high", "matched_keywords": [...], "reason": str}
    """
    msg_lower = message.lower()
    
    # 1. Keyword Matching
    matched = {"high": [], "medium": [], "low": []}
    
    for level, keywords in DISTRESS_KEYWORDS.items():
        for kw in keywords:
            # We use regex word boundaries so 'sad' doesn't trigger on 'saddle'
            if re.search(r'\b' + re.escape(kw.lower()) + r'\b', msg_lower):
                matched[level].append(kw)
                
    # 2. Base Scoring Thresholds
    base_level = "none"
    reason = "No distress keywords detected."
    
    num_high = len(matched["high"])
    num_medium = len(matched["medium"])
    num_low = len(matched["low"])
    
    if num_high >= 1:
        base_level = "high"
        reason = f"Detected {num_high} high-severity keyword(s)."
    elif num_medium >= 2:
        base_level = "high"  # Multiple medium signals constitute a high distress state
        reason = f"Detected {num_medium} medium-severity keywords (escalated to high)."
    elif num_medium == 1:
        base_level = "medium"
        reason = "Detected 1 medium-severity keyword."
    elif num_low >= 1:
        base_level = "low"
        reason = f"Detected {num_low} low-severity keyword(s)."
        
    # 3. Repetition Escalation
    # Count how many times the user has said this exact same message in history
    user_msgs = [turn["content"].lower() for turn in session_history if turn["role"] == "user"]
    repetition_count = user_msgs.count(msg_lower)
    
    final_level = base_level
    if repetition_count >= 3:
        # Escalate by one tier
        escalation_map = {"none": "low", "low": "medium", "medium": "high", "high": "high"}
        final_level = escalation_map[base_level]
        if final_level != base_level:
            reason += f" Escalated to {final_level} because this message was repeated {repetition_count} times."

    all_matched = matched["high"] + matched["medium"] + matched["low"]
    
    # If no base keywords were found but we escalated due to repetition, ensure we don't say "No distress keywords detected" entirely
    if base_level == "none" and final_level != "none":
        reason = f"Escalated to {final_level} because this message was repeated {repetition_count} times (frustration/confusion signal)."

    return {
        "level": final_level,
        "matched_keywords": all_matched,
        "reason": reason.strip()
    }

def handle_escalation(session_id: str, distress_result: dict) -> dict:
    if distress_result["level"] == "high":
        # For demo: log it clearly + flag session for the caregiver dashboard to poll
        print(f"[ESCALATION] session={session_id} level=high reason={distress_result['reason']}")
        # TODO later: push notification / SMS via a real service
        return {"escalated": True, "action": "caregiver_alerted"}
    return {"escalated": False}
