from bson import ObjectId
from typing import List

from app.models.task import (
    DesignStatus,
    ApprovalStatus,
    PostingStatus,
)
from app.repositories.task_repo import TaskRepository
from app.services.task_history_service import TaskHistoryService
from app.services.notification_service import NotificationService


class TaskImportCommitService:
    def __init__(
        self,
        task_repo: TaskRepository,
        history_service: TaskHistoryService,
        notification_service: NotificationService,
    ):
        self.task_repo = task_repo
        self.history = history_service
        self.notify = notification_service

    async def commit(
        self,
        rows: List[dict],
        user: dict,
    ):
        created = 0
        failed_rows: List[int] = []

        for row in rows:
            try:
                data = row.get("data", {})

                # HARD SAFETY (validation should already ensure this)
                if not data.get("content_type") or not data.get("title"):
                    failed_rows.append(row["row_number"])
                    continue

                task_data = {
                    "content_type": data.get("content_type"),
                    "size": data.get("size"),
                    "title": data.get("title"),
                    "content": data.get("content"),
                    "instructions": data.get("instructions"),
                    "deadline": data.get("deadline"),
                    "tags": data.get("tags", []),

                    # Preserve imported extras
                    "extra_data": data.get("extra_data", {}),

                    "assigned_by_id": ObjectId(user["_id"]),
                    "designer_id": None,

                    "design_status": DesignStatus.PENDING,
                    "approval_status": ApprovalStatus.PENDING,
                    "posting_status": PostingStatus.DRAFT,
                    "approval_comment": None,
                }

                created_task = await self.task_repo.create(task_data)

                await self.history.log_action(
                    task_id=created_task["_id"],
                    action="BULK_CREATE_TASK",
                    performed_by=ObjectId(user["_id"]),
                    role=user["role"],
                )

                created += 1

            except Exception:
                failed_rows.append(row.get("row_number"))

        return {
            "total_rows": len(rows),
            "created": created,
            "failed": len(failed_rows),
            "failed_rows": failed_rows,
        }
