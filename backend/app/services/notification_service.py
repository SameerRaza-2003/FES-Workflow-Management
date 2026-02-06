from bson import ObjectId
from typing import List

from app.repositories.notification_repo import NotificationRepository


class NotificationService:
    def __init__(self, repo: NotificationRepository):
        self.repo = repo

    async def notify(
        self,
        user_id: ObjectId,
        type: str,
        message: str,
        task_id: ObjectId | None = None,
        actor_name: str | None = None,
        actor_role: str | None = None,
        action: str | None = None,
        task_title: str | None = None,
    ) -> None:
        await self.repo.create(
            user_id=user_id,
            type=type,
            message=message,
            task_id=task_id,
            actor_name=actor_name,
            actor_role=actor_role,
            action=action,
            task_title=task_title,
        )

    async def my_notifications(self, user: dict) -> List[dict]:
        return await self.repo.list_for_user(ObjectId(user["_id"]))

    async def mark_as_read(self, notification_id: str) -> None:
        await self.repo.mark_read(ObjectId(notification_id))

