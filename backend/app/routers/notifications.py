from fastapi import APIRouter, Depends, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.notification import NotificationResponse
from app.repositories.notification_repo import NotificationRepository
from app.services.notification_service import NotificationService

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


def get_notification_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> NotificationService:
    repo = NotificationRepository(db)
    return NotificationService(repo)


@router.get("/", response_model=list[NotificationResponse])
async def my_notifications(
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    notifications = await service.my_notifications(current_user)

    return [
        NotificationResponse(
            id=str(n["_id"]),
            user_id=str(n["user_id"]),
            type=n["type"],
            message=n["message"],
            task_id=str(n["task_id"]) if n.get("task_id") else None,
            is_read=n["is_read"],
            created_at=n["created_at"],
        )
        for n in notifications
    ]


@router.post(
    "/{notification_id}/read",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    service: NotificationService = Depends(get_notification_service),
):
    await service.mark_as_read(notification_id)
