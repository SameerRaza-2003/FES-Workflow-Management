from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.task import TaskCreate, TaskResponse
from app.repositories.task_repo import TaskRepository
from app.repositories.task_history_repo import TaskHistoryRepository
from app.services.task_service import TaskService
from app.services.task_history_service import TaskHistoryService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# 🔧 FIXED DEPENDENCY WIRING (IMPORTANT)
def get_task_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TaskService:
    task_repo = TaskRepository(db)
    history_repo = TaskHistoryRepository(db)
    history_service = TaskHistoryService(history_repo)

    return TaskService(task_repo, history_service)


def to_task_response(task: dict) -> TaskResponse:
    return TaskResponse(
        id=str(task["_id"]),
        content_type=task["content_type"],
        size=task.get("size"),
        title=task["title"],
        content=task.get("content"),
        instructions=task.get("instructions"),
        deadline=task.get("deadline"),
        tags=task.get("tags", []),
        assigned_by_id=str(task["assigned_by_id"]),
        designer_id=str(task["designer_id"]) if task.get("designer_id") else None,
        design_status=task["design_status"],
        approval_status=task["approval_status"],
        posting_status=task["posting_status"],
        approval_comment=task.get("approval_comment"),
        created_at=task["created_at"],
        updated_at=task["updated_at"],
    )


class AssignDesignerRequest(BaseModel):
    designer_id: str


class RequestChangesRequest(BaseModel):
    comment: str


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    return to_task_response(await service.create_task(payload, current_user))


@router.get("/", response_model=list[TaskResponse])
async def list_tasks(
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    return [to_task_response(t) for t in await service.list_tasks()]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    return to_task_response(await service.get_task(task_id))


@router.post("/{task_id}/assign", response_model=TaskResponse)
async def assign_designer(
    task_id: str,
    payload: AssignDesignerRequest,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    return to_task_response(
        await service.assign_designer(task_id, payload.designer_id, current_user)
    )


@router.post("/{task_id}/start", response_model=TaskResponse)
async def start_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    return to_task_response(await service.start_task(task_id, current_user))


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    return to_task_response(await service.complete_task(task_id, current_user))


@router.post("/{task_id}/approve", response_model=TaskResponse)
async def approve_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    return to_task_response(await service.approve_task(task_id, current_user))


@router.post("/{task_id}/request-changes", response_model=TaskResponse)
async def request_changes(
    task_id: str,
    payload: RequestChangesRequest,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    return to_task_response(
        await service.request_changes(task_id, payload.comment, current_user)
    )
