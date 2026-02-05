from typing import List
from bson import ObjectId

from app.repositories.task_history_repo import TaskHistoryRepository


class TaskHistoryService:
    def __init__(self, repo: TaskHistoryRepository):
        self.repo = repo

    async def log_action(
        self,
        task_id: ObjectId,
        action: str,
        performed_by: ObjectId,
        role: str,
        comment: str | None = None,
    ) -> None:
        await self.repo.log(
            task_id=task_id,
            action=action,
            performed_by=performed_by,
            role=role,
            comment=comment,
        )

    async def get_task_history(self, task_id: str) -> List[dict]:
        """
        Returns full history timeline for a task.
        Invalid task IDs return an empty list (safe for UI).
        """
        try:
            task_oid = ObjectId(task_id)
        except Exception:
            return []

        return await self.repo.list_for_task(task_oid)
