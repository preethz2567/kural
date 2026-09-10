import urllib.request
import json
import textwrap

BASE_URL = "http://127.0.0.1:8000/chat/patient_001"

def send_msg(session_id, prompt):
    data = {
        "session_id": session_id,
        "message": prompt
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
            print(f"USER: {prompt}")
            print(f"DISTRESS: {distress.get('level')} | Escalated: {distress.get('escalated')} | Reason: {distress.get('reason')}")
            print(f"KURAL:\n{wrapped_resp}\n")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode()
        print(f"ERROR: HTTP {e.code}: {error_body}\n")
    except Exception as e:
        print(f"ERROR: Failed to connect or received error. {e}\n")

print("=========================================")
print("Testing Escalation Logic...")
print("=========================================\n")

print("--- Scenario 1: High Distress ---")
send_msg("esc_session_1", "Help me, I want to go home, please get me out of here!")

print("--- Scenario 2: Medium (Single) ---")
send_msg("esc_session_2", "I don't understand, I don't like it here.")

print("--- Scenario 3: Medium (Repeated -> Escalates to High) ---")
print("Turn 1...")
send_msg("esc_session_3", "Nobody visits me anymore.")
print("Turn 2...")
send_msg("esc_session_3", "Nobody visits me anymore.")
print("Turn 3 (Should trigger escalation)...")
send_msg("esc_session_3", "Nobody visits me anymore.") 

print("--- Scenario 4: Low Only ---")
send_msg("esc_session_4", "I feel tired and I miss him.")

print("--- Scenario 5: Control ---")
send_msg("esc_session_5", "Tell me about my trip with friends")
