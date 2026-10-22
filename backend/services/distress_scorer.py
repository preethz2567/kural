# Simple keyword-based scoring config for distress detection.
# This makes the logic transparent and easy to explain to judges, avoiding black-box unpredictability.

DISTRESS_KEYWORDS = {
    "high": [
        "dying", "die", "feel like dying", "feels like dying", "want to die", "kill myself", "end my life",
        "suicide", "hurt myself", "hurting myself", "harm myself", "scared", "help me", "get me out",
        "where am i", "i want to go home", "leave me alone", "no no no", "terrified", "frightened",
        "panic", "can't breathe", "cannot breathe", "chest pain", "fell down", "bleeding", "emergency",
        "save me", "please help", "danger", "stranger in my house", "someone broke in",
        # Tamil high distress keywords
        "சாகணும்", "சாக தோன்றுகிறது", "பயமா இருக்கு", "காப்பாத்துங்க", "வீட்டுக்கு போகணும்", "உதவி பண்ணுங்க"
    ],
    "medium": [
        "nobody visits", "all alone", "confused", "i don't understand", "i don't like it here",
        "who are you", "what is this place", "why am i here", "lost", "where is everyone",
        "where is my mother", "where is my father", "where is my husband", "where is my wife",
        "where are my children", "forgetting", "forgot", "head hurts", "anxious", "worried",
        "nervous", "frustrated", "angry", "crying", "scary", "shadows",
        # Tamil medium distress keywords
        "யாரும் வரல", "குழப்பமா இருக்கு", "புரியல", "எங்க இருக்கேன்", "பயம்"
    ],
    "low": [
        "tired", "sad", "miss him", "miss her", "feeling down", "feeling low", "bad", "not good",
        "lonely", "upset", "bored", "cold", "uncomfortable", "hungry", "thirsty", "restless",
        "sleepy", "exhausted", "pain", "aching",
        # Tamil low distress keywords
        "சோகமா இருக்கு", "களைப்பா இருக்கு", "வலிகுது", "தனிமையா இருக்கு"
    ]
}

# TODO: A message can also escalate based on repetition frequency, not just keywords.
# e.g., the same distress-adjacent question 3+ times in 10 minutes = escalate regardless of keyword severity
