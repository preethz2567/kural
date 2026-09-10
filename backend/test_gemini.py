import os
import urllib.request
import json

def test_gemini():
    # Read the .env file to get the key
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    api_key = None
    
    try:
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('GEMINI_API_KEY='):
                    api_key = line.strip().split('=', 1)[1]
                    break
    except FileNotFoundError:
        print("Error: .env file not found")
        return

    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return

    print("Testing Gemini API key by listing available models...")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    req = urllib.request.Request(url)

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print("\nSuccess! Your Gemini API key works.")
            models = [m['name'] for m in result.get('models', [])[:5]]
            print(f"Here are some available models: {', '.join(models)}")
    except urllib.error.HTTPError as e:
        print(f"\nHTTP Error {e.code}: {e.reason}")
        error_body = e.read().decode()
        print(f"Details: {error_body}")
    except Exception as e:
        print(f"\nFailed with error: {e}")

if __name__ == "__main__":
    test_gemini()
