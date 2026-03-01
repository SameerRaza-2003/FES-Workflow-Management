from datetime import datetime

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.analytics_bottleneck import (
    TaskRisk,
    DesignerLoad,
)
from app.services.analytics.analytics_bottleneck_service import (
    AnalyticsBottleneckService,
)


router = APIRouter(
    prefix="/analytics/bottlenecks",
    tags=["Analytics – Bottlenecks"],
)


def get_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> AnalyticsBottleneckService:
    return AnalyticsBottleneckService(db)


def _to_risk(task: dict) -> TaskRisk:
    """Safely convert a raw MongoDB task document to TaskRisk."""
    deadline = task.get("deadline")
    days_remaining = None
    if deadline:
        days_remaining = (deadline - datetime.utcnow()).days
    return TaskRisk(
        task_id=str(task["_id"]),
        title=task.get("title", "Untitled"),
        designer_id=str(task["designer_id"]) if task.get("designer_id") else None,
        deadline=deadline,
        days_remaining=days_remaining,
    )


# ---------------- DEADLINES ----------------

@router.get(
    "/overdue",
    response_model=list[TaskRisk],
    summary="Overdue tasks (Admin)",
)
async def overdue_tasks(
    current_user: dict = Depends(get_current_user),
    service: AnalyticsBottleneckService = Depends(get_service),
):
    tasks = await service.overdue_tasks()
    return [_to_risk(t) for t in tasks]


@router.get(
    "/at-risk",
    response_model=list[TaskRisk],
    summary="Tasks nearing deadline",
)
async def tasks_at_risk(
    days: int = 3,
    current_user: dict = Depends(get_current_user),
    service: AnalyticsBottleneckService = Depends(get_service),
):
    tasks = await service.tasks_at_risk(days)
    return [_to_risk(t) for t in tasks]


# ---------------- DESIGNER LOAD ----------------

@router.get(
    "/designer-load",
    response_model=list[DesignerLoad],
    summary="Overloaded designers",
)
async def designer_load(
    threshold: int = 10,
    current_user: dict = Depends(get_current_user),
    service: AnalyticsBottleneckService = Depends(get_service),
):
    return await service.designer_overload(threshold)


# ---------------- STUCK TASKS ----------------

@router.get(
    "/stuck",
    response_model=list[TaskRisk],
    summary="Tasks stuck in working state",
)
async def stuck_tasks(
    days: int = 5,
    current_user: dict = Depends(get_current_user),
    service: AnalyticsBottleneckService = Depends(get_service),
):
    tasks = await service.stuck_tasks(days)
    return [_to_risk(t) for t in tasks]
