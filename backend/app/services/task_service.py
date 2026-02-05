from typing import List

from bson import ObjectId
from fastapi import HTTPException, status

from app.models.task import (
    TaskCreate,
    DesignStatus,
    ApprovalStatus,
    PostingStatus,
)
from app.repositories.task_repo import TaskRepository
from app.services.task_history_service import TaskHistoryService
from app.services.notification_service import NotificationService


class TaskService:
    def __init__(
        self,
        repo: TaskRepository,
        history_service: TaskHistoryService,
        notification_service: NotificationService,
    ):
        self.repo = repo
        self.history = history_service
        self.notifications = notification_service

    # ---------- CREATE ----------

    async def create_task(self, task: TaskCreate, user: dict) -> dict:
        if user.get("role") not in {"Admin", "Assigner"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to create tasks",
            )

        task_data = task.model_dump()
        task_data.update(
            {
                "assigned_by_id": ObjectId(user["_id"]),
                "designer_id": None,
                "design_status": DesignStatus.PENDING,
                "approval_status": ApprovalStatus.PENDING,
                "posting_status": PostingStatus.DRAFT,
                "approval_comment": None,
            }
        )

        created = await self.repo.create(task_data)

        await self.history.log_action(
            task_id=created["_id"],
            action="CREATE_TASK",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        return created

    # ---------- READ ----------

    async def list_tasks(self) -> List[dict]:
        return await self.repo.list()

    async def get_task(self, task_id: str) -> dict:
        task = await self.repo.get_by_id(task_id)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )
        return task

    # ---------- ASSIGN ----------

    async def assign_designer(self, task_id: str, designer_id: str, user: dict) -> dict:
        if user.get("role") not in {"Admin", "Assigner"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to assign designer",
            )

        try:
            designer_oid = ObjectId(designer_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid designer ID",
            )

        task = await self.repo.assign_designer(task_id, designer_oid)
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found",
            )

        await self.history.log_action(
            task_id=task["_id"],
            action="ASSIGN_DESIGNER",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        # 🔔 Notification
        await self.notifications.notify(
            user_id=designer_oid,
            type="TASK_ASSIGNED",
            message="You have been assigned a new task",
            task_id=task["_id"],
        )

        return task

    # ---------- DESIGNER WORKFLOW ----------

    async def start_task(self, task_id: str, user: dict) -> dict:
        if user.get("role") != "Designer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only designers can start tasks",
            )

        task = await self.get_task(task_id)

        if task.get("designer_id") != ObjectId(user["_id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Task not assigned to you",
            )

        if task["design_status"] != DesignStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task cannot be started",
            )

        updated = await self.repo.update(
            task_id,
            {"design_status": DesignStatus.WORKING},
        )

        await self.history.log_action(
            task_id=updated["_id"],
            action="START_TASK",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        return updated

    async def complete_task(self, task_id: str, user: dict) -> dict:
        if user.get("role") != "Designer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only designers can complete tasks",
            )

        task = await self.get_task(task_id)

        if task.get("designer_id") != ObjectId(user["_id"]):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Task not assigned to you",
            )

        if task["design_status"] != DesignStatus.WORKING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be in Working state",
            )

        updated = await self.repo.update(
            task_id,
            {"design_status": DesignStatus.COMPLETED},
        )

        await self.history.log_action(
            task_id=updated["_id"],
            action="COMPLETE_TASK",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        # 🔔 Notify assigner/admin
        await self.notifications.notify(
            user_id=task["assigned_by_id"],
            type="TASK_COMPLETED",
            message="A task has been completed and is ready for review",
            task_id=updated["_id"],
        )

        return updated

    # ---------- APPROVAL WORKFLOW ----------

    async def approve_task(self, task_id: str, user: dict) -> dict:
        if user.get("role") not in {"Approver", "Admin"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to approve tasks",
            )

        task = await self.get_task(task_id)

        if task["design_status"] != DesignStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be completed before approval",
            )

        updated = await self.repo.update(
            task_id,
            {
                "approval_status": ApprovalStatus.APPROVED,
                "approval_comment": None,
            },
        )

        await self.history.log_action(
            task_id=updated["_id"],
            action="APPROVE_TASK",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        # 🔔 Notify designer
        await self.notifications.notify(
            user_id=task["designer_id"],
            type="TASK_APPROVED",
            message="Your task has been approved",
            task_id=updated["_id"],
        )

        return updated

    async def request_changes(self, task_id: str, comment: str, user: dict) -> dict:
        if user.get("role") not in {"Approver", "Admin"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to request changes",
            )

        if not comment or not comment.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Approval comment is required",
            )

        task = await self.get_task(task_id)

        if task["design_status"] != DesignStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be completed before requesting changes",
            )

        updated = await self.repo.update(
            task_id,
            {
                "approval_status": ApprovalStatus.CHANGES_REQUIRED,
                "design_status": DesignStatus.WORKING,
                "approval_comment": comment,
            },
        )

        await self.history.log_action(
            task_id=updated["_id"],
            action="REQUEST_CHANGES",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
            comment=comment,
        )

        # 🔔 Notify designer
        await self.notifications.notify(
            user_id=task["designer_id"],
            type="CHANGES_REQUESTED",
            message="Changes were requested on your task",
            task_id=updated["_id"],
        )

        return updated

    # ---------- ROLE-BASED VIEWS ----------

    async def my_tasks(self, user: dict) -> List[dict]:
        if user.get("role") != "Designer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only designers can view their tasks",
            )

        return await self.repo.list_for_designer(ObjectId(user["_id"]))

    async def pending_approval_tasks(self, user: dict) -> List[dict]:
        if user.get("role") not in {"Approver", "Admin"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to view pending approval tasks",
            )

        return await self.repo.list_pending_approval()
