from fastapi import FastAPI
from app.routers import auth
from app.routers import tasks



app = FastAPI(title="Workflow Management System")

app.include_router(auth.router)
app.include_router(tasks.router)
@app.get("/")
def health():
    return {"status": "ok"}
