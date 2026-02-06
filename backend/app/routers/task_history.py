from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.task_history import TaskHistoryResponse
from app.repositories.task_history_repo import TaskHistoryRepository
from app.repositories.user_repo import UserRepository
from app.services.task_history_service import TaskHistoryService

router = APIRouter(
    prefix="/tasks/{task_id}/history",
    tags=["Tasks – History"],
)


def get_history_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TaskHistoryService:
    repo = TaskHistoryRepository(db)
    return TaskHistoryService(repo)


@router.get("/", response_model=list[TaskHistoryResponse])
async def get_task_history(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskHistoryService = Depends(get_history_service),
):
    history = await service.get_task_history(task_id)
    
    # Batch lookup all performer names
    user_ids = [str(h["performed_by"]) for h in history]
    names_map = await UserRepository.get_names_map(user_ids)

    return [
        TaskHistoryResponse(
            id=str(h["_id"]),
            task_id=str(h["task_id"]),
            action=h["action"],
            performed_by=str(h["performed_by"]),
            performed_by_name=names_map.get(str(h["performed_by"])),
            role=h["role"],
            comment=h.get("comment"),
            created_at=h["created_at"],
        )
        for h in history
    ]
