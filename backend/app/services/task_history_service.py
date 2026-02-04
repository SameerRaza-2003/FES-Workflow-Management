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
    ):
        await self.repo.log(
            task_id=task_id,
            action=action,
            performed_by=performed_by,
            role=role,
            comment=comment,
        )
