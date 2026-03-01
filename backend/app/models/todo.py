from enum import Enum
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field


class TodoStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TodoPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ─── Request / Response Schemas ──────────────────────────────

class TodoCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: TodoPriority = TodoPriority.MEDIUM
    due_date: Optional[datetime] = None
    reminder_datetime: Optional[datetime] = None
    tags: List[str] = []
    assigned_to: List[str] = []          # user-id strings
    linked_task_id: Optional[str] = None  # optional workflow task ref
    visible_to_all: bool = False          # show to entire team


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TodoStatus] = None
    priority: Optional[TodoPriority] = None
    due_date: Optional[datetime] = None
    reminder_datetime: Optional[datetime] = None
    tags: Optional[List[str]] = None
    assigned_to: Optional[List[str]] = None
    visible_to_all: Optional[bool] = None


class TodoResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: TodoStatus
    priority: TodoPriority
    due_date: Optional[datetime] = None
    reminder_datetime: Optional[datetime] = None
    tags: List[str] = []
    assigned_to: List[str] = []
    linked_task_id: Optional[str] = None
    visible_to_all: bool = False
    created_by: str
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
