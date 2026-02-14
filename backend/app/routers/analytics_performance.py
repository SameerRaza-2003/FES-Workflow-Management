from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.analytics_performance import (
    DesignerPerformance,
    MyPerformance,
    AssignerPerformance,
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
    start_date: Optional[str] = Query(None, description="ISO date string YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="ISO date string YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    service: AnalyticsPerformanceService = Depends(get_service),
):
    if str(current_user.get("role", "")).lower() != "admin":
        raise PermissionError("Admins only")

    return await service.performance_by_designer(start_date=start_date, end_date=end_date)


@router.get(
    "/assigners",
    response_model=list[AssignerPerformance],
    summary="Performance metrics by task assigner (Admin)",
)
async def performance_all_assigners(
    start_date: Optional[str] = Query(None, description="ISO date string YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="ISO date string YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    service: AnalyticsPerformanceService = Depends(get_service),
):
    if str(current_user.get("role", "")).lower() != "admin":
        raise PermissionError("Admins only")

    return await service.performance_by_assigner(start_date=start_date, end_date=end_date)


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
