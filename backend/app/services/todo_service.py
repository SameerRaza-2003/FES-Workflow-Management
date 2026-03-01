from typing import List, Optional

from bson import ObjectId
from fastapi import HTTPException, status

from app.repositories.todo_repository import TodoRepository
from app.repositories.notification_repo import NotificationRepository


class TodoService:
    def __init__(
        self,
        repo: TodoRepository,
        notification_repo: NotificationRepository,
    ):
        self.repo = repo
        self.notification_repo = notification_repo

    # ─── CREATE ──────────────────────────────────────────────

    async def create_todo(self, data: dict, current_user: dict) -> dict:
        user_id = str(current_user["_id"])
        user_role = str(current_user.get("role", "")).lower()
        user_name = current_user.get("full_name", "Someone")

        data["created_by"] = user_id

        # Non-admins can only create personal todos (no assigning)
        if user_role != "admin":
            data["assigned_to"] = []

        todo = await self.repo.create(data)

        # Notify assignees
        for assignee_id in data.get("assigned_to", []):
            if assignee_id != user_id:
                await self.notification_repo.create(
                    user_id=ObjectId(assignee_id),
                    type="todo_assigned",
                    message=f'{user_name} assigned you a todo: "{data["title"]}"',
                    actor_name=user_name,
                    actor_role=current_user.get("role", ""),
                    action="todo_assigned",
                )

        return todo

    # ─── READ ────────────────────────────────────────────────

    async def list_todos(
        self,
        current_user: dict,
        status_filter: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> List[dict]:
        user_id = str(current_user["_id"])
        return await self.repo.list_for_user(user_id, status=status_filter, priority=priority)

    async def get_today(self, current_user: dict) -> List[dict]:
        return await self.repo.list_today(str(current_user["_id"]))

    async def get_upcoming(self, current_user: dict) -> List[dict]:
        return await self.repo.list_upcoming(str(current_user["_id"]))

    async def get_overdue(self, current_user: dict) -> List[dict]:
        return await self.repo.list_overdue(str(current_user["_id"]))

    # ─── UPDATE ──────────────────────────────────────────────

    async def update_todo(
        self, todo_id: str, data: dict, current_user: dict
    ) -> dict:
        todo = await self.repo.get_by_id(todo_id)
        if not todo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Todo not found",
            )

        user_id = str(current_user["_id"])
        is_owner = todo["created_by"] == user_id
        is_assignee = user_id in todo.get("assigned_to", [])
        is_admin = str(current_user.get("role", "")).lower() == "admin"

        if not (is_owner or is_assignee or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this todo",
            )

        updated = await self.repo.update(todo_id, data)
        if not updated:
            raise HTTPException(status_code=404, detail="Update failed")
        return updated

    # ─── DELETE ──────────────────────────────────────────────

    async def delete_todo(self, todo_id: str, current_user: dict) -> None:
        todo = await self.repo.get_by_id(todo_id)
        if not todo:
            raise HTTPException(status_code=404, detail="Todo not found")

        user_id = str(current_user["_id"])
        is_owner = todo["created_by"] == user_id
        is_admin = str(current_user.get("role", "")).lower() == "admin"

        if not (is_owner or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the creator or an admin can delete this todo",
            )

        await self.repo.delete(todo_id)
