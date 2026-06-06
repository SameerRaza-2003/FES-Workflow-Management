from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.db.mongo import get_db
from app.core.dependencies import get_current_user

from app.models.task_import_commit import (
    TaskImportCommitRow,
    TaskImportCommitResponse,
)

from app.repositories.task_repo import TaskRepository
from app.repositories.task_history_repo import TaskHistoryRepository
from app.repositories.notification_repo import NotificationRepository

from app.services.task_history_service import TaskHistoryService
from app.services.notification_service import NotificationService
from app.services.task_import_commit_service import TaskImportCommitService

router = APIRouter(
    prefix="/tasks/import",
    tags=["Tasks – Import"],
)


def get_commit_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TaskImportCommitService:
    task_repo = TaskRepository(db)

    history_service = TaskHistoryService(
        TaskHistoryRepository(db)
    )

    notification_service = NotificationService(
        NotificationRepository(db), db
    )

    return TaskImportCommitService(
        task_repo,
        history_service,
        notification_service,
    )


@router.post(
    "/commit",
    response_model=TaskImportCommitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Commit validated tasks to database",
)
async def commit_task_import(
    rows: List[TaskImportCommitRow],
    current_user: dict = Depends(get_current_user),
    service: TaskImportCommitService = Depends(get_commit_service),
):
    return await service.commit(
        rows=[r.model_dump() for r in rows],
        user=current_user,
    )
