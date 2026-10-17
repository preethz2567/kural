import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the backend directory is in sys.path so internal imports (routers, models, services, store, prompts)
# succeed whether started from repository root (uvicorn backend.main:app) or backend/ (uvicorn main:app)
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from routers import patient, chat

app = FastAPI(title="Kural API")

# Narrowly scoped development CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patient.router)
app.include_router(chat.router)

@app.get("/ping")
async def ping():
    return {"status": "ok"}
