from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user

from app.models.task_comment import (
    TaskCommentCreate,
    TaskCommentResponse,
)

from app.repositories.task_comment_repo import TaskCommentRepository
from app.repositories.task_repo import TaskRepository
from app.repositories.notification_repo import NotificationRepository
from app.repositories.user_repo import UserRepository

from app.services.task_comment_service import TaskCommentService
from app.services.notification_service import NotificationService

router = APIRouter(
    prefix="/tasks/{task_id}/comments",
    tags=["Tasks – Comments"],
)


# =========================================================
# DEPENDENCY WIRING
# =========================================================

def get_comment_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TaskCommentService:
    comment_repo = TaskCommentRepository(db)
    task_repo = TaskRepository(db)

    notification_repo = NotificationRepository(db)
    notification_service = NotificationService(notification_repo, db)

    return TaskCommentService(
        comment_repo,
        task_repo,
        notification_service,
    )


# =========================================================
# ADD COMMENT
# =========================================================

@router.post(
    "/",
    response_model=TaskCommentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add comment to task",
)
async def add_comment(
    task_id: str,
    payload: TaskCommentCreate,
    current_user: dict = Depends(get_current_user),
    service: TaskCommentService = Depends(get_comment_service),
):
    comment = await service.add_comment(
        task_id=task_id,
        content=payload.content,
        user=current_user,
    )
    
    # Get author name
    author_id_str = str(comment["author_id"])
    names_map = await UserRepository.get_names_map([author_id_str])

    return TaskCommentResponse(
        id=str(comment["_id"]),
        task_id=str(comment["task_id"]),
        author_id=author_id_str,
        author_name=names_map.get(author_id_str),
        author_role=comment["author_role"],
        content=comment["content"],
        created_at=comment["created_at"],
    )


# =========================================================
# LIST COMMENTS
# =========================================================

@router.get(
    "/",
    response_model=list[TaskCommentResponse],
    summary="List task comments",
)
async def list_comments(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    service: TaskCommentService = Depends(get_comment_service),
):
    comments = await service.list_comments(task_id)
    
    # Batch lookup all author names
    author_ids = [str(c["author_id"]) for c in comments]
    names_map = await UserRepository.get_names_map(author_ids)

    return [
        TaskCommentResponse(
            id=str(c["_id"]),
            task_id=str(c["task_id"]),
            author_id=str(c["author_id"]),
            author_name=names_map.get(str(c["author_id"])),
            author_role=c["author_role"],
            content=c["content"],
            created_at=c["created_at"],
        )
        for c in comments
    ]
