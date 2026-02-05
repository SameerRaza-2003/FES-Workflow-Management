from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.services.analytics.priority_service import PriorityService
from app.models.analytics_priority import PriorityTaskResponse

router = APIRouter(
    prefix="/analytics/priority",
    tags=["Analytics – Priority"],
)


def get_service(db: AsyncIOMotorDatabase = Depends(get_db)):
    return PriorityService(db)


@router.get(
    "/",
    response_model=List[PriorityTaskResponse],
    summary="Get priority tasks (urgency + event boost)",
)
async def priority_tasks(
    limit: int = Query(10, ge=1, le=100),
    event_boost: int = Query(50, ge=0, le=200),
    current_user: dict = Depends(get_current_user),
    service: PriorityService = Depends(get_service),
):
    return await service.get_priority_tasks(
        limit=limit,
        event_boost=event_boost,
    )
