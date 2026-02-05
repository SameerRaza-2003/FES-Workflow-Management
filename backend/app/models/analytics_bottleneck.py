from pydantic import BaseModel
from datetime import datetime


class TaskRisk(BaseModel):
    task_id: str
    title: str
    designer_id: str | None
    deadline: datetime | None
    days_remaining: int | None


class DesignerLoad(BaseModel):
    designer_id: str
    active_tasks: int
