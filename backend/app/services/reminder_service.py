import asyncio
import logging

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.repositories.todo_repository import TodoRepository
from app.repositories.notification_repo import NotificationRepository

logger = logging.getLogger(__name__)


class ReminderService:
    """Background scheduler that fires todo reminders as notifications."""

    def __init__(self, db: AsyncIOMotorDatabase, interval_seconds: int = 60):
        self.todo_repo = TodoRepository(db)
        self.notification_repo = NotificationRepository(db)
        self.interval = interval_seconds

    async def run_forever(self):
        """Poll for due reminders every `interval` seconds."""
        logger.info("Reminder scheduler started (interval=%ds)", self.interval)
        while True:
            try:
                await self._process_due_reminders()
            except Exception as e:
                logger.error("Reminder scheduler error: %s", e)
            await asyncio.sleep(self.interval)

    async def _process_due_reminders(self):
        due_todos = await self.todo_repo.list_due_reminders()
        for todo in due_todos:
            # Notify every assignee + creator
            targets = set(todo.get("assigned_to", []))
            targets.add(todo["created_by"])

            for uid in targets:
                try:
                    from bson import ObjectId
                    await self.notification_repo.create(
                        user_id=ObjectId(uid),
                        type="todo_reminder",
                        message=f'⏰ Reminder: "{todo["title"]}"',
                        action="todo_reminder",
                    )
                except Exception as e:
                    logger.error("Failed to send reminder to %s: %s", uid, e)

            # Mark as sent
            await self.todo_repo.mark_reminder_sent(todo["_id"])
            logger.info("Sent reminder for todo: %s", todo["title"])
