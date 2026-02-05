from pydantic import BaseModel
from typing import Optional
from datetime import date


class PriorityTaskResponse(BaseModel):
    task_id: str
    title: Optional[str]
    content_type: Optional[str]
    designer_id: Optional[str]
    assigned_by_id: Optional[str]

    deadline: Optional[date]
    days_to_deadline: Optional[int]

    urgency_score: int
    event_cover: bool
    priority_score: int
