import urllib.request
import json
import textwrap

BASE_URL = "http://127.0.0.1:8000/chat/patient_001"

scenarios = [
    {
        "desc": "Primary delusion test (deceased grandparent)",
        "prompt": "Where is Thatha Nagarajan? Call him, I want to talk to him."
    },
    {
        "desc": "Time/place disorientation (school)",
        "prompt": "I need to leave for St. John's, I'll be late for school."
    },
    {
        "desc": "Not recognizing someone / redirecting warmly",
        "prompt": "Who are you? Are you Ramya?"
    },
    {
        "desc": "Control test - living relative",
        "prompt": "Where is Amma? I want to see her."
    },
    {
        "desc": "Work-context confusion",
        "prompt": "I have a meeting at JP Morgan, help me get ready."
    },
    {
        "desc": "Emotional distress cue (pure warmth/validation test)",
        "prompt": "Nobody visits me anymore, I'm all alone."
    },
    {
        "desc": "Factual recall / positive memory",
        "prompt": "Tell me about my trip with my friends."
    },
    {
        "desc": "Living friend, no delusion (should stay positive)",
        "prompt": "Is Shivani coming today? I haven't seen her in years."
    },
    {
        "desc": "Positive factual affirmation",
        "prompt": "Was I ever Head Girl?"
    },
    {
        "desc": "Mid-stage sensory/agitation cue",
        "prompt": "I don't like it here, it's too hot, take me home."
    }
]

print("=========================================")
print("Testing /chat endpoint with Preethi's Profile...")
print("Ensure your backend is running: uvicorn main:app --reload")
print("=========================================\n")

for i, scenario in enumerate(scenarios, 1):
    print(f"--- Scenario {i}: {scenario['desc']} ---")
    print(f"USER: {scenario['prompt']}")
    
    data = {
        "session_id": "test_session_001",
        "message": scenario['prompt']
    }
    req = urllib.request.Request(
        BASE_URL, 
        data=json.dumps(data).encode("utf-8"), 
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            bot_resp = result.get('response', '')
            distress = result.get('distress', {})
            wrapped_resp = textwrap.fill(bot_resp, width=80, initial_indent='      ', subsequent_indent='      ')
            print(f"DISTRESS: {distress.get('level')} (Keywords: {distress.get('matched_keywords')}) - {distress.get('reason')}")
            print(f"KURAL:\n{wrapped_resp}\n")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"ERROR: HTTP {e.code}: {error_body}\n")
    except Exception as e:
        print(f"ERROR: Failed to connect or received error. {e}\n")
