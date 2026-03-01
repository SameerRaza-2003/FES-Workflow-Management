from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.dependencies import get_current_user
from app.models.event import EventCreate, EventUpdate, EventResponse
from app.repositories.event_repository import EventRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.event_service import EventService


router = APIRouter(
    prefix="/events",
    tags=["Events"],
)


def get_event_service(
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> EventService:
    return EventService(
        repo=EventRepository(db),
        notification_repo=NotificationRepository(db),
    )


def _serialize(event: dict) -> EventResponse:
    return EventResponse(
        id=str(event["_id"]),
        title=event["title"],
        description=event.get("description"),
        start_datetime=event["start_datetime"],
        end_datetime=event["end_datetime"],
        participants=event.get("participants", []),
        color_label=event.get("color_label", "#6366f1"),
        event_type=event.get("event_type", "other"),
        created_by=event["created_by"],
        created_at=event["created_at"],
    )


# ─── CRUD ────────────────────────────────────────────────────

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    current_user: dict = Depends(get_current_user),
    service: EventService = Depends(get_event_service),
):
    event = await service.create_event(body.model_dump(), current_user)
    return _serialize(event)


@router.get("/", response_model=list[EventResponse])
async def list_events(
    month: str = Query(..., description="YYYY-MM format, e.g. 2026-03"),
    current_user: dict = Depends(get_current_user),
    service: EventService = Depends(get_event_service),
):
    try:
        year, m = month.split("-")
        year, m = int(year), int(m)
    except (ValueError, AttributeError):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")

    events = await service.list_by_month(year, m)
    return [_serialize(e) for e in events]


@router.get("/day", response_model=list[EventResponse])
async def day_events(
    date: str = Query(..., description="YYYY-MM-DD"),
    current_user: dict = Depends(get_current_user),
    service: EventService = Depends(get_event_service),
):
    try:
        dt = datetime.fromisoformat(date)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    events = await service.list_by_day(dt)
    return [_serialize(e) for e in events]


@router.patch("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    body: EventUpdate,
    current_user: dict = Depends(get_current_user),
    service: EventService = Depends(get_event_service),
):
    data = body.model_dump(exclude_unset=True)
    updated = await service.update_event(event_id, data, current_user)
    return _serialize(updated)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: str,
    current_user: dict = Depends(get_current_user),
    service: EventService = Depends(get_event_service),
):
    await service.delete_event(event_id, current_user)
