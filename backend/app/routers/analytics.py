from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.services.analytics.analytics_service import AnalyticsService
from app.models.analytics import (
    AnalyticsOverviewResponse,
)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


def get_service(db: AsyncIOMotorDatabase = Depends(get_db)):
    return AnalyticsService(db)


@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def overview(
    current_user: dict = Depends(get_current_user),
    service: AnalyticsService = Depends(get_service),
):
    return await service.overview()


@router.get("/by-designer")
async def by_designer(
    current_user: dict = Depends(get_current_user),
    service: AnalyticsService = Depends(get_service),
):
    return await service.by_field("designer_id")


@router.get("/by-assigner")
async def by_assigner(
    current_user: dict = Depends(get_current_user),
    service: AnalyticsService = Depends(get_service),
):
    return await service.by_field("assigned_by_id")


@router.get("/by-content-type")
async def by_content_type(
    current_user: dict = Depends(get_current_user),
    service: AnalyticsService = Depends(get_service),
):
    return await service.by_content_type()
