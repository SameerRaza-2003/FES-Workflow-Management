from typing import List, Optional

from bson import ObjectId
from fastapi import HTTPException, status

from app.models.task import (
    TaskCreate,
    TaskUpdate,
    DesignStatus,
    ApprovalStatus,
    PostingStatus,
)
from app.repositories.task_repo import TaskRepository
from app.repositories.user_repo import UserRepository
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

    # ---------- HELPER: Get actor name ----------

    async def _get_user_name(self, user: dict) -> str:
        """Get display name for a user"""
        return user.get("full_name") or user.get("email", "").split("@")[0] or "Unknown"

    # ---------- CREATE ----------

    async def create_task(self, task: TaskCreate, user: dict) -> dict:
        user_role = str(user.get("role", "")).lower()
        if user_role not in {"admin", "assigner", "approver"}:
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

    # ---------- UPDATE (Admin Edit) ----------

    async def update_task(self, task_id: str, updates: TaskUpdate, user: dict) -> dict:
        """Admin can update task details. Notifies designer if assigned."""
        user_role = str(user.get("role", "")).lower()
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can edit tasks",
            )

        task = await self.get_task(task_id)
        
        # Build update dict (only non-None fields)
        update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        if not update_data:
            return task  # Nothing to update
        
        updated = await self.repo.update(task_id, update_data)

        await self.history.log_action(
            task_id=updated["_id"],
            action="EDIT_TASK",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        # 🔔 Notify designer if assigned
        if task.get("designer_id"):
            actor_name = await self._get_user_name(user)
            task_title = task.get("title", "Task")
            
            await self.notifications.notify(
                user_id=task["designer_id"],
                type="TASK_EDITED",
                message=f"{actor_name} (Admin) updated the task '{task_title}'",
                task_id=updated["_id"],
                actor_name=actor_name,
                actor_role="Admin",
                action="edited",
                task_title=task_title,
            )

        return updated

    # ---------- ASSIGN ----------

    async def assign_designer(self, task_id: str, designer_id: str, user: dict) -> dict:
        user_role = str(user.get("role", "")).lower()
        if user_role not in {"admin", "assigner", "approver"}:
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

        # 🔔 Rich notification
        actor_name = await self._get_user_name(user)
        task_title = task.get("title", "Task")
        
        await self.notifications.notify(
            user_id=designer_oid,
            type="TASK_ASSIGNED",
            message=f"{actor_name} ({user['role'].title()}) assigned you to '{task_title}'",
            task_id=task["_id"],
            actor_name=actor_name,
            actor_role=user["role"].title(),
            action="assigned",
            task_title=task_title,
        )

        return task

    # ---------- DESIGNER WORKFLOW ----------

    async def start_task(self, task_id: str, user: dict) -> dict:
        user_role = str(user.get("role", "")).lower()
        if user_role != "designer":
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

        # Allow starting from Pending or after ChangesRequired
        if task["design_status"] not in {DesignStatus.PENDING, DesignStatus.WORKING}:
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

    async def complete_task(self, task_id: str, user: dict, designer_upload_url: str = None) -> dict:
        user_role = str(user.get("role", "")).lower()
        if user_role != "designer":
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

        # Reset approval_status to Pending if changes were requested
        # This allows the admin to re-approve the task
        update_data = {"design_status": DesignStatus.COMPLETED}
        if task["approval_status"] == ApprovalStatus.CHANGES_REQUIRED:
            update_data["approval_status"] = ApprovalStatus.PENDING
            update_data["approval_comment"] = None  # Clear the old comment

        # Append to designer_uploads history
        if designer_upload_url:
            existing_uploads = task.get("designer_uploads", [])
            revision = len(existing_uploads) + 1
            from datetime import datetime as dt
            new_upload = {
                "url": designer_upload_url,
                "uploaded_at": dt.utcnow(),
                "revision": revision,
            }
            # Use $push to append atomically
            await self.repo.collection.update_one(
                {"_id": ObjectId(task_id)},
                {"$push": {"designer_uploads": new_upload}},
            )

        updated = await self.repo.update(
            task_id,
            update_data,
        )

        await self.history.log_action(
            task_id=updated["_id"],
            action="COMPLETE_TASK",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        # 🔔 Notify assigner/admin with rich message
        designer_name = await self._get_user_name(user)
        task_title = task.get("title", "Task")
        
        await self.notifications.notify(
            user_id=task["assigned_by_id"],
            type="TASK_COMPLETED",
            message=f"{designer_name} completed '{task_title}' - ready for review",
            task_id=updated["_id"],
            actor_name=designer_name,
            actor_role="Designer",
            action="completed",
            task_title=task_title,
        )

        return updated

    # ---------- TWO-LAYER APPROVAL WORKFLOW ----------

    async def admin_approve_task(self, task_id: str, user: dict) -> dict:
        """
        Layer 1: Admin approves the task.
        Sets approval_status to AdminApproved, then moves to Approver queue.
        """
        user_role = str(user.get("role", "")).lower()
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can perform first-layer approval",
            )

        task = await self.get_task(task_id)

        if task["design_status"] != DesignStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be completed before approval",
            )
        
        if task["approval_status"] != ApprovalStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task is not in pending approval state",
            )

        updated = await self.repo.update(
            task_id,
            {
                "approval_status": ApprovalStatus.ADMIN_APPROVED,
                "approval_comment": None,
            },
        )

        await self.history.log_action(
            task_id=updated["_id"],
            action="ADMIN_APPROVE",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        # 🔔 Notify designer
        admin_name = await self._get_user_name(user)
        task_title = task.get("title", "Task")
        
        if task.get("designer_id"):
            await self.notifications.notify(
                user_id=task["designer_id"],
                type="TASK_ADMIN_APPROVED",
                message=f"{admin_name} (Admin) approved '{task_title}' - awaiting final approval",
                task_id=updated["_id"],
                actor_name=admin_name,
                actor_role="Admin",
                action="admin-approved",
                task_title=task_title,
            )

        return updated

    async def approver_approve_task(self, task_id: str, user: dict) -> dict:
        """
        Layer 2: Approver gives final approval.
        Only works on tasks that have approval_status = AdminApproved.
        """
        user_role = str(user.get("role", "")).lower()
        if user_role != "approver":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only approvers can give final approval",
            )

        task = await self.get_task(task_id)

        if task["approval_status"] != ApprovalStatus.ADMIN_APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be admin-approved before final approval",
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
            action="FINAL_APPROVE",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
        )

        # 🔔 Notify designer
        approver_name = await self._get_user_name(user)
        task_title = task.get("title", "Task")
        
        if task.get("designer_id"):
            await self.notifications.notify(
                user_id=task["designer_id"],
                type="TASK_APPROVED",
                message=f"{approver_name} (Approver) gave final approval on '{task_title}'",
                task_id=updated["_id"],
                actor_name=approver_name,
                actor_role="Approver",
                action="approved",
                task_title=task_title,
            )
        
        # Also notify the admin who created the task
        await self.notifications.notify(
            user_id=task["assigned_by_id"],
            type="TASK_APPROVED",
            message=f"'{task_title}' has been fully approved by {approver_name}",
            task_id=updated["_id"],
            actor_name=approver_name,
            actor_role="Approver",
            action="approved",
            task_title=task_title,
        )

        return updated

    async def admin_request_changes(self, task_id: str, comment: str, user: dict) -> dict:
        """Admin requests changes on a completed task."""
        user_role = str(user.get("role", "")).lower()
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can request changes at this stage",
            )

        if not comment or not comment.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment is required when requesting changes",
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
            action="ADMIN_REQUEST_CHANGES",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
            comment=comment,
        )

        # 🔔 Notify designer
        admin_name = await self._get_user_name(user)
        task_title = task.get("title", "Task")
        
        if task.get("designer_id"):
            await self.notifications.notify(
                user_id=task["designer_id"],
                type="CHANGES_REQUESTED",
                message=f"{admin_name} (Admin) requested changes on '{task_title}'",
                task_id=updated["_id"],
                actor_name=admin_name,
                actor_role="Admin",
                action="requested-changes",
                task_title=task_title,
            )

        return updated

    async def approver_request_changes(self, task_id: str, comment: str, user: dict) -> dict:
        """Approver requests changes on an admin-approved task."""
        user_role = str(user.get("role", "")).lower()
        if user_role != "approver":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only approvers can request changes at this stage",
            )

        if not comment or not comment.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Comment is required when requesting changes",
            )

        task = await self.get_task(task_id)

        if task["approval_status"] != ApprovalStatus.ADMIN_APPROVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task must be admin-approved before approver can request changes",
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
            action="APPROVER_REQUEST_CHANGES",
            performed_by=ObjectId(user["_id"]),
            role=user["role"],
            comment=comment,
        )

        # 🔔 Notify designer
        approver_name = await self._get_user_name(user)
        task_title = task.get("title", "Task")
        
        if task.get("designer_id"):
            await self.notifications.notify(
                user_id=task["designer_id"],
                type="CHANGES_REQUESTED",
                message=f"{approver_name} (Approver) requested changes on '{task_title}'",
                task_id=updated["_id"],
                actor_name=approver_name,
                actor_role="Approver",
                action="requested-changes",
                task_title=task_title,
            )

        return updated

    # ---------- ROLE-BASED VIEWS ----------

    async def my_tasks(self, user: dict) -> List[dict]:
        user_role = str(user.get("role", "")).lower()
        if user_role != "designer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only designers can view their tasks",
            )

        return await self.repo.list_for_designer(ObjectId(user["_id"]))

    async def pending_admin_approval_tasks(self, user: dict) -> List[dict]:
        """Tasks completed by designer, waiting for Admin approval (Layer 1)"""
        user_role = str(user.get("role", "")).lower()
        if user_role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view pending admin approval tasks",
            )

        return await self.repo.list_pending_admin_approval()

    async def pending_final_approval_tasks(self, user: dict) -> List[dict]:
        """Tasks approved by Admin, waiting for Approver (Layer 2)"""
        user_role = str(user.get("role", "")).lower()
        if user_role != "approver":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only approvers can view pending final approval tasks",
            )

        return await self.repo.list_pending_final_approval()
