from fastapi import FastAPI
from app.routers import auth
from app.routers import tasks
from app.routers import task_history
from app.routers import task_comments
from app.routers import notifications
from app.routers import task_import




app = FastAPI(title="Workflow Management System")

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(task_history.router)
app.include_router(task_comments.router)
app.include_router(notifications.router)
app.include_router(task_import.router)


@app.get("/")
def health():
    return {"status": "ok"}
