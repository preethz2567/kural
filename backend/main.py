from fastapi import FastAPI
from routers import patient, chat

app = FastAPI(title="Kural API")

app.include_router(patient.router)
app.include_router(chat.router)

@app.get("/ping")
async def ping():
    return {"status": "ok"}

