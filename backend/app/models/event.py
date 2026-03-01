from enum import Enum
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class EventType(str, Enum):
    MEETING = "meeting"
    DEADLINE = "deadline"
    REVIEW = "review"
    OTHER = "other"


# ─── Request / Response Schemas ──────────────────────────────

class EventCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    participants: List[str] = []       # user-id strings
    color_label: str = "#6366f1"       # default indigo
    event_type: EventType = EventType.OTHER


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_datetime: Optional[datetime] = None
    end_datetime: Optional[datetime] = None
    participants: Optional[List[str]] = None
    color_label: Optional[str] = None
    event_type: Optional[EventType] = None


class EventResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    start_datetime: datetime
    end_datetime: datetime
    participants: List[str] = []
    color_label: str
    event_type: EventType
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
