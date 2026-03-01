from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from fastapi import HTTPException, status

from app.repositories.event_repository import EventRepository
from app.repositories.notification_repo import NotificationRepository


class EventService:
    def __init__(
        self,
        repo: EventRepository,
        notification_repo: NotificationRepository,
    ):
        self.repo = repo
        self.notification_repo = notification_repo

    # ─── CREATE ──────────────────────────────────────────────

    async def create_event(self, data: dict, current_user: dict) -> dict:
        user_id = str(current_user["_id"])
        user_name = current_user.get("full_name", "Someone")

        if data["start_datetime"] >= data["end_datetime"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time",
            )

        data["created_by"] = user_id

        event = await self.repo.create(data)

        # Notify participants
        for participant_id in data.get("participants", []):
            if participant_id != user_id:
                await self.notification_repo.create(
                    user_id=ObjectId(participant_id),
                    type="event_invite",
                    message=f'{user_name} invited you to: "{data["title"]}"',
                    actor_name=user_name,
                    actor_role=current_user.get("role", ""),
                    action="event_invite",
                )

        return event

    # ─── READ ────────────────────────────────────────────────

    async def list_by_month(
        self, year: int, month: int
    ) -> List[dict]:
        return await self.repo.list_by_month(year, month)

    async def list_by_day(
        self, date: datetime
    ) -> List[dict]:
        return await self.repo.list_by_day(date)

    # ─── UPDATE ──────────────────────────────────────────────

    async def update_event(
        self, event_id: str, data: dict, current_user: dict
    ) -> dict:
        event = await self.repo.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        user_id = str(current_user["_id"])
        is_creator = event["created_by"] == user_id
        is_admin = str(current_user.get("role", "")).lower() == "admin"

        if not (is_creator or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the creator or an admin can update this event",
            )

        # Validate times if both provided
        start = data.get("start_datetime", event["start_datetime"])
        end = data.get("end_datetime", event["end_datetime"])
        if start >= end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="End time must be after start time",
            )

        updated = await self.repo.update(event_id, data)
        if not updated:
            raise HTTPException(status_code=404, detail="Update failed")
        return updated

    # ─── DELETE ──────────────────────────────────────────────

    async def delete_event(
        self, event_id: str, current_user: dict
    ) -> None:
        event = await self.repo.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        user_id = str(current_user["_id"])
        is_creator = event["created_by"] == user_id
        is_admin = str(current_user.get("role", "")).lower() == "admin"

        if not (is_creator or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the creator or an admin can delete this event",
            )

        await self.repo.delete(event_id)
