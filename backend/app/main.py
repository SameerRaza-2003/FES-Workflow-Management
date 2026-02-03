from fastapi import FastAPI
from app.routers import auth

app = FastAPI(title="Workflow Management System")

app.include_router(auth.router)

@app.get("/")
def health():
    return {"status": "ok"}
