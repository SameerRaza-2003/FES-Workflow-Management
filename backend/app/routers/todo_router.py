from fastapi import APIRouter, Depends, Query, status
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.todo import TodoCreate, TodoUpdate, TodoResponse, TodoStatus, TodoPriority
from app.repositories.todo_repository import TodoRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.todo_service import TodoService


router = APIRouter(
    prefix="/todos",
    tags=["Todos"],
)


def get_todo_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TodoService:
    return TodoService(
        repo=TodoRepository(db),
        notification_repo=NotificationRepository(db),
    )


def _serialize(todo: dict) -> TodoResponse:
    return TodoResponse(
        id=str(todo["_id"]),
        title=todo["title"],
        description=todo.get("description"),
        status=todo.get("status", "todo"),
        priority=todo.get("priority", "medium"),
        due_date=todo.get("due_date"),
        reminder_datetime=todo.get("reminder_datetime"),
        tags=todo.get("tags", []),
        assigned_to=todo.get("assigned_to", []),
        linked_task_id=todo.get("linked_task_id"),
        visible_to_all=todo.get("visible_to_all", False),
        created_by=todo["created_by"],
        created_at=todo["created_at"],
        updated_at=todo["updated_at"],
    )


# ─── CRUD ────────────────────────────────────────────────────

@router.post("/", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
async def create_todo(
    body: TodoCreate,
    current_user: dict = Depends(get_current_user),
    service: TodoService = Depends(get_todo_service),
):
    todo = await service.create_todo(body.model_dump(), current_user)
    return _serialize(todo)


@router.get("/", response_model=list[TodoResponse])
async def list_todos(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    service: TodoService = Depends(get_todo_service),
):
    todos = await service.list_todos(current_user, status_filter=status_filter, priority=priority)
    return [_serialize(t) for t in todos]


@router.get("/today", response_model=list[TodoResponse])
async def today_todos(
    current_user: dict = Depends(get_current_user),
    service: TodoService = Depends(get_todo_service),
):
    return [_serialize(t) for t in await service.get_today(current_user)]


@router.get("/upcoming", response_model=list[TodoResponse])
async def upcoming_todos(
    current_user: dict = Depends(get_current_user),
    service: TodoService = Depends(get_todo_service),
):
    return [_serialize(t) for t in await service.get_upcoming(current_user)]


@router.get("/overdue", response_model=list[TodoResponse])
async def overdue_todos(
    current_user: dict = Depends(get_current_user),
    service: TodoService = Depends(get_todo_service),
):
    return [_serialize(t) for t in await service.get_overdue(current_user)]


@router.patch("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: str,
    body: TodoUpdate,
    current_user: dict = Depends(get_current_user),
    service: TodoService = Depends(get_todo_service),
):
    data = body.model_dump(exclude_unset=True)
    updated = await service.update_todo(todo_id, data, current_user)
    return _serialize(updated)


@router.delete("/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: str,
    current_user: dict = Depends(get_current_user),
    service: TodoService = Depends(get_todo_service),
):
    await service.delete_todo(todo_id, current_user)
