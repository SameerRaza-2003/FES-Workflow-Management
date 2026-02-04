from bson import ObjectId
from fastapi import HTTPException, status

from app.models.task import (
    TaskCreate,
    DesignStatus,
    ApprovalStatus,
    PostingStatus,
)
from app.repositories.task_repo import TaskRepository


class TaskService:
    def __init__(self, repo: TaskRepository):
        self.repo = repo

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

        return await self.repo.create(task_data)

    # ---------- READ ----------

    async def list_tasks(self) -> list[dict]:
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

        return await self.repo.update(
            task_id,
            {"design_status": DesignStatus.WORKING},
        )

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

        return await self.repo.update(
            task_id,
            {"design_status": DesignStatus.COMPLETED},
        )

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

        return await self.repo.update(
            task_id,
            {
                "approval_status": ApprovalStatus.APPROVED,
                "approval_comment": None,
            },
        )

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

        return await self.repo.update(
            task_id,
            {
                "approval_status": ApprovalStatus.CHANGES_REQUIRED,
                "design_status": DesignStatus.WORKING,
                "approval_comment": comment,
            },
        )
