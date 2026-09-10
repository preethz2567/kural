import os
import anthropic
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic()

try:
    models = client.models.list()
    print("Available models:")
    for m in models.data:
        print(m.id)
except Exception as e:
    print(f"Error: {e}")
