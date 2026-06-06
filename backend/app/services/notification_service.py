import logging
from bson import ObjectId
from typing import List

from app.repositories.notification_repo import NotificationRepository

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self, repo: NotificationRepository, db=None):
        self.repo = repo
        self.db = db

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
        # Save in-app notification
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

        # Also send via WhatsApp if user has phone
        await self._send_whatsapp_if_available(user_id, message)

    async def _send_whatsapp_if_available(self, user_id: ObjectId, message: str) -> None:
        """Send WhatsApp notification if user has a phone number."""
        if self.db is None:
            return

        try:
            user = await self.db["users"].find_one({"_id": user_id})
            if not user or not user.get("phone"):
                return

            from app.services.whatsapp_service import WhatsAppService
            wa_service = WhatsAppService(self.db)
            await wa_service.send_message(
                to_phone=user["phone"],
                body=f"🔔 {message}",
            )
        except Exception as e:
            logger.warning(f"WhatsApp notification failed: {e}")

    async def my_notifications(self, user: dict) -> List[dict]:
        return await self.repo.list_for_user(ObjectId(user["_id"]))

    async def mark_as_read(self, notification_id: str) -> None:
        await self.repo.mark_read(ObjectId(notification_id))

