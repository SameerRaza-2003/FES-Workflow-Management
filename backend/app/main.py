from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from app.routers import auth
from app.routers import tasks
from app.routers import task_history
from app.routers import task_comments
from app.routers import notifications
from app.routers import task_import
from app.routers import task_import_validation
from app.routers import task_import_commit
from app.routers import analytics_performance
from app.routers import analytics_bottleneck
from app.routers import users
from app.routers import social
from app.routers import upload
from app.routers import ai
from app.routers import todo_router
from app.routers import event_router
from app.routers import whatsapp

app = FastAPI(title="Workflow Management System")

# ✅ CORS CONFIG
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://workflow.fespak.com",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(task_history.router)
app.include_router(task_comments.router)
app.include_router(notifications.router)
app.include_router(task_import.router)
app.include_router(task_import_validation.router)
app.include_router(task_import_commit.router)
app.include_router(analytics_performance.router)
app.include_router(analytics_bottleneck.router)
app.include_router(users.router)
app.include_router(social.router)
app.include_router(upload.router)
app.include_router(ai.router)
app.include_router(todo_router.router)
app.include_router(event_router.router)
app.include_router(whatsapp.router)


@app.on_event("startup")
async def start_reminder_scheduler():
    from app.db.mongo import db
    from app.services.reminder_service import ReminderService
    scheduler = ReminderService(db, interval_seconds=60)
    asyncio.create_task(scheduler.run_forever())


@app.get("/")
def health():
    return {"status": "ok"}
