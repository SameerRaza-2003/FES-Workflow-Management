from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.task_comment import (
    TaskCommentCreate,
    TaskCommentResponse,
)
from app.repositories.task_comment_repo import TaskCommentRepository
from app.services.task_comment_service import TaskCommentService

router = APIRouter(
    prefix="/tasks/{task_id}/comments",
    tags=["Tasks – Comments"],
)


def get_comment_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> TaskCommentService:
    repo = TaskCommentRepository(db)
    return TaskCommentService(repo)


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

    return TaskCommentResponse(
        id=str(comment["_id"]),
        task_id=str(comment["task_id"]),
        author_id=str(comment["author_id"]),
        author_role=comment["author_role"],
        content=comment["content"],
        created_at=comment["created_at"],
    )


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

    return [
        TaskCommentResponse(
            id=str(c["_id"]),
            task_id=str(c["task_id"]),
            author_id=str(c["author_id"]),
            author_role=c["author_role"],
            content=c["content"],
            created_at=c["created_at"],
        )
        for c in comments
    ]
