from typing import List
import re

from bson import ObjectId
from fastapi import HTTPException, status

from app.repositories.task_comment_repo import TaskCommentRepository
from app.repositories.task_repo import TaskRepository
from app.services.notification_service import NotificationService


MENTION_REGEX = r"@(\w+)"


class TaskCommentService:
    def __init__(
        self,
        repo: TaskCommentRepository,
        task_repo: TaskRepository,
        notification_service: NotificationService,
    ):
        self.repo = repo
        self.task_repo = task_repo
        self.notifications = notification_service

    # ---------- CREATE COMMENT ----------

    async def add_comment(
        self,
        task_id: str,
        content: str,
        user: dict,
    ) -> dict:
        if not content or not content.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment cannot be empty",
            )

        try:
            task_oid = ObjectId(task_id)
            author_oid = ObjectId(user["_id"])
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID",
            )

        # Create comment
        comment = await self.repo.create(
            task_id=task_oid,
            author_id=author_oid,
            author_role=user["role"],
            content=content.strip(),
        )

        # Load task to determine participants
        task = await self.task_repo.get_by_id(task_id)
        if not task:
            return comment

        recipients = set()

        if task.get("designer_id"):
            recipients.add(task["designer_id"])

        if task.get("assigned_by_id"):
            recipients.add(task["assigned_by_id"])

        # Do not notify comment author
        recipients.discard(author_oid)

        # 🔔 Notify participants (best-effort)
        for recipient_id in recipients:
            try:
                await self.notifications.notify(
                    user_id=recipient_id,
                    type="TASK_COMMENT",
                    message="New comment added to a task",
                    task_id=task_oid,
                )
            except Exception:
                pass  # Notifications must never break comments

        # 🔎 Mentions foundation (parsed, not enforced yet)
        mentions = re.findall(MENTION_REGEX, content)
        # Future use: map mentions → users → notifications

        return comment

    # ---------- LIST COMMENTS ----------

    async def list_comments(
        self,
        task_id: str,
    ) -> List[dict]:
        try:
            task_oid = ObjectId(task_id)
        except Exception:
            return []

        return await self.repo.list_for_task(task_oid)
