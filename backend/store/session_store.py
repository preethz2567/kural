from datetime import datetime
from typing import List, Dict

# In-memory store: { session_id: [{"role": str, "content": str, "timestamp": str}, ...] }
_history_store: Dict[str, List[Dict[str, str]]] = {}

def get_history(session_id: str) -> List[Dict[str, str]]:
    return _history_store.get(session_id, [])

def append_turn(session_id: str, role: str, content: str, distress: dict = None) -> None:
    if session_id not in _history_store:
        _history_store[session_id] = []
    
    turn = {
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    }
    if distress:
        turn["distress"] = distress
        
    _history_store[session_id].append(turn)
