from datetime import datetime
from typing import List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.task import TaskCreate, TaskUpdate, TaskResponse

from app.repositories.task_repo import TaskRepository
from app.repositories.task_history_repo import TaskHistoryRepository
from app.repositories.notification_repo import NotificationRepository
from app.repositories.user_repo import UserRepository

from app.services.task_service import TaskService
from app.services.task_history_service import TaskHistoryService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/tasks")


# =========================================================
# DEPENDENCY WIRING
# =========================================================

def get_task_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TaskService:
    task_repo = TaskRepository(db)

    history_repo = TaskHistoryRepository(db)
    history_service = TaskHistoryService(history_repo)

    notification_repo = NotificationRepository(db)
    notification_service = NotificationService(notification_repo)

    return TaskService(
        task_repo,
        history_service,
        notification_service,
    )


# =========================================================
# RESPONSE MAPPER (WITH USER NAME LOOKUP)
# =========================================================

async def to_task_response(task: dict) -> TaskResponse:
    """Convert DB task to response, resolving user IDs to names."""
    # Collect user IDs to lookup
    user_ids = []
    if task.get("assigned_by_id"):
        user_ids.append(str(task["assigned_by_id"]))
    if task.get("designer_id"):
        user_ids.append(str(task["designer_id"]))
    
    # Batch lookup names
    names_map = await UserRepository.get_names_map(user_ids)
    
    assigned_by_id_str = str(task["assigned_by_id"])
    designer_id_str = str(task["designer_id"]) if task.get("designer_id") else None
    
    return TaskResponse(
        id=str(task["_id"]),
        content_type=task["content_type"],
        size=task.get("size"),
        title=task["title"],
        content=task.get("content"),
        instructions=task.get("instructions"),
        deadline=task.get("deadline"),
        tags=task.get("tags", []),
        content_for=task.get("content_for"),
        is_urgent=task.get("is_urgent", False),
        reference_images=task.get("reference_images", []),
        
        assigned_by_id=assigned_by_id_str,
        designer_id=designer_id_str,
        
        # Resolved names
        assigned_by_name=names_map.get(assigned_by_id_str),
        designer_name=names_map.get(designer_id_str) if designer_id_str else None,

        # Status fields with safe defaults
        design_status=task.get("design_status", "Pending"),
        approval_status=task.get("approval_status", "Pending"),
        posting_status=task.get("posting_status", "Draft"),

        approval_comment=task.get("approval_comment"),
        designer_uploads=task.get("designer_uploads", []),
        created_at=task["created_at"],
        updated_at=task["updated_at"],
    )


# =========================================================
# REQUEST MODELS
# =========================================================

class AssignDesignerRequest(BaseModel):
    designer_id: str


class RequestChangesRequest(BaseModel):
    comment: str


class CompleteTaskRequest(BaseModel):
    designer_upload_url: str = None


# =========================================================
# 🔥 STATIC ROUTES FIRST
# =========================================================

@router.get(
    "/my",
    response_model=List[TaskResponse],
    tags=["Tasks – Designer"],
    summary="My tasks (Designer)",
)
async def my_tasks(
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    tasks = await service.my_tasks(current_user)
    return [await to_task_response(t) for t in tasks]


@router.get(
    "/pending-admin-approval",
    response_model=List[TaskResponse],
    tags=["Tasks – Approval (Admin)"],
    summary="Pending admin approval tasks (Layer 1)",
)
async def pending_admin_approval_tasks(
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    tasks = await service.pending_admin_approval_tasks(current_user)
    return [await to_task_response(t) for t in tasks]


@router.get(
    "/pending-final-approval",
    response_model=List[TaskResponse],
    tags=["Tasks – Approval (Approver)"],
    summary="Pending final approval tasks (Layer 2)",
)
async def pending_final_approval_tasks(
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    tasks = await service.pending_final_approval_tasks(current_user)
    return [await to_task_response(t) for t in tasks]


# =========================================================
# CORE CRUD
# =========================================================

@router.post(
    "/",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Tasks – Core"],
)
async def create_task(
    payload: TaskCreate,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    created = await service.create_task(payload, current_user)
    return await to_task_response(created)


@router.get(
    "/",
    response_model=List[TaskResponse],
    tags=["Tasks – Core"],
)
async def list_tasks(
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    tasks = await service.list_tasks()
    return [await to_task_response(t) for t in tasks]


# =========================================================
# ⚠️ DYNAMIC ROUTES LAST
# =========================================================

@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    tags=["Tasks – Core"],
)
async def get_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    task = await service.get_task(task_id)
    return await to_task_response(task)


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    tags=["Tasks – Admin"],
    summary="Update task details (Admin only)",
)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    updated = await service.update_task(task_id, payload, current_user)
    return await to_task_response(updated)


@router.post(
    "/{task_id}/assign",
    response_model=TaskResponse,
    tags=["Tasks – Assignment (Admin)"],
)
async def assign_designer(
    task_id: str,
    payload: AssignDesignerRequest,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    task = await service.assign_designer(task_id, payload.designer_id, current_user)
    return await to_task_response(task)


@router.post(
    "/{task_id}/start",
    response_model=TaskResponse,
    tags=["Tasks – Designer"],
)
async def start_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    task = await service.start_task(task_id, current_user)
    return await to_task_response(task)


@router.post(
    "/{task_id}/complete",
    response_model=TaskResponse,
    tags=["Tasks – Designer"],
)
async def complete_task(
    task_id: str,
    payload: CompleteTaskRequest = None,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    upload_url = payload.designer_upload_url if payload else None
    task = await service.complete_task(task_id, current_user, designer_upload_url=upload_url)
    return await to_task_response(task)


class DesignerUploadRequest(BaseModel):
    url: str


@router.post(
    "/{task_id}/upload",
    response_model=TaskResponse,
    tags=["Tasks – Designer"],
    summary="Upload an image to a task (Designer)",
)
async def upload_to_task(
    task_id: str,
    payload: DesignerUploadRequest,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    """
    Standalone upload — designer can attach images anytime while Working
    or after ChangesRequired (before re-completing).
    """
    user_role = str(current_user.get("role", "")).lower()
    if user_role != "designer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only designers can upload to tasks",
        )

    task_doc = await service.get_task(task_id)

    if task_doc.get("designer_id") != ObjectId(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Task not assigned to you")

    # Append to uploads
    existing = task_doc.get("designer_uploads", [])
    revision = len(existing) + 1
    new_upload = {
        "url": payload.url,
        "uploaded_at": datetime.utcnow(),
        "revision": revision,
    }

    await service.repo.collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"designer_uploads": new_upload}},
    )

    updated = await service.get_task(task_id)
    return await to_task_response(updated)


# =========================================================
# TWO-LAYER APPROVAL ENDPOINTS
# =========================================================

@router.post(
    "/{task_id}/admin-approve",
    response_model=TaskResponse,
    tags=["Tasks – Approval (Admin)"],
    summary="Admin approves task (Layer 1)",
)
async def admin_approve_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    task = await service.admin_approve_task(task_id, current_user)
    return await to_task_response(task)


@router.post(
    "/{task_id}/admin-request-changes",
    response_model=TaskResponse,
    tags=["Tasks – Approval (Admin)"],
    summary="Admin requests changes",
)
async def admin_request_changes(
    task_id: str,
    payload: RequestChangesRequest,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    task = await service.admin_request_changes(task_id, payload.comment, current_user)
    return await to_task_response(task)


@router.post(
    "/{task_id}/final-approve",
    response_model=TaskResponse,
    tags=["Tasks – Approval (Approver)"],
    summary="Approver gives final approval (Layer 2)",
)
async def final_approve_task(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    task = await service.approver_approve_task(task_id, current_user)
    return await to_task_response(task)


@router.post(
    "/{task_id}/approver-request-changes",
    response_model=TaskResponse,
    tags=["Tasks – Approval (Approver)"],
    summary="Approver requests changes",
)
async def approver_request_changes(
    task_id: str,
    payload: RequestChangesRequest,
    current_user: dict = Depends(get_current_user),
    service: TaskService = Depends(get_task_service),
):
    task = await service.approver_request_changes(task_id, payload.comment, current_user)
    return await to_task_response(task)
