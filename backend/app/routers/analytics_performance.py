from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.analytics_performance import (
    DesignerPerformance,
    MyPerformance,
)
from app.services.analytics.analytics_performance_service import (
    AnalyticsPerformanceService,
)


router = APIRouter(
    prefix="/analytics/performance",
    tags=["Analytics – Performance"],
)


def get_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AnalyticsPerformanceService:
    return AnalyticsPerformanceService(db)


# ---------------- ADMIN ----------------

@router.get(
    "/designers",
    response_model=list[DesignerPerformance],
    summary="Performance of all designers (Admin)",
)
async def performance_all_designers(
    current_user: dict = Depends(get_current_user),
    service: AnalyticsPerformanceService = Depends(get_service),
):
    if current_user.get("role") != "Admin":
        raise PermissionError("Admins only")

    return await service.performance_by_designer()


# ---------------- DESIGNER ----------------

@router.get(
    "/me",
    response_model=MyPerformance,
    summary="My performance (Designer)",
)
async def my_performance(
    current_user: dict = Depends(get_current_user),
    service: AnalyticsPerformanceService = Depends(get_service),
):
    return await service.my_performance(current_user)
