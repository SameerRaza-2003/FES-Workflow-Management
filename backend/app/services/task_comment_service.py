from typing import List
from bson import ObjectId
from fastapi import HTTPException, status

from app.repositories.task_comment_repo import TaskCommentRepository


class TaskCommentService:
    def __init__(self, repo: TaskCommentRepository):
        self.repo = repo

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

        return await self.repo.create(
            task_id=task_oid,
            author_id=author_oid,
            author_role=user["role"],
            content=content.strip(),
        )

    async def list_comments(
        self,
        task_id: str,
    ) -> List[dict]:
        try:
            task_oid = ObjectId(task_id)
        except Exception:
            return []

        return await self.repo.list_for_task(task_oid)
