# Simple keyword-based scoring config for distress detection.
# This makes the logic transparent and easy to explain to judges, avoiding black-box unpredictability.

DISTRESS_KEYWORDS = {
    "high": [
        "scared", "help me", "get me out", "where am I", 
        "i want to go home", "leave me alone", "no no no"
    ],
    "medium": [
        "nobody visits", "all alone", "confused", 
        "i don't understand", "i don't like it here"
    ],
    "low": [
        "tired", "sad", "miss him", "miss her"
    ]
}

# TODO: A message can also escalate based on repetition frequency, not just keywords.
# e.g., the same distress-adjacent question 3+ times in 10 minutes = escalate regardless of keyword severity
