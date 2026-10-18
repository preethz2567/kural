import sys
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the backend directory is in sys.path so internal imports succeed
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Explicitly load .env from backend/ directory and project root
load_dotenv(backend_dir / ".env")
load_dotenv(backend_dir.parent / ".env")

from routers import patient, chat, voice

app = FastAPI(title="Kural API")

# Narrowly scoped CORS for local Vite development and the deployed Vercel frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://kural-pi.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patient.router)
app.include_router(chat.router)
app.include_router(voice.router)

@app.get("/ping")
async def ping():
    return {"status": "ok"}
