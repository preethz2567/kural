import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/chat/patient_001"

def send_msg(msg):
    data = {"session_id": "smoke_test_123", "message": msg}
    req = urllib.request.Request(
        BASE_URL, 
        data=json.dumps(data).encode("utf-8"), 
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print(f"KURAL: {result.get('response')}\n")
    except Exception as e:
        print(f"ERROR: {e}")

print("USER: I have a secret word, it's 'Mango'.")
send_msg("I have a secret word, it's 'Mango'.")

print("USER: What was my secret word?")
send_msg("What was my secret word?")
