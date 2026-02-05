from fastapi import FastAPI
from app.routers import auth
from app.routers import tasks
from app.routers import task_history
from app.routers import task_comments




app = FastAPI(title="Workflow Management System")

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(task_history.router)
app.include_router(task_comments.router)


@app.get("/")
def health():
    return {"status": "ok"}
