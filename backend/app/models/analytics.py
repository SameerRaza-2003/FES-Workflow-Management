from pydantic import BaseModel
from typing import List


class AnalyticsOverviewResponse(BaseModel):
    total_tasks: int
    completed: int
    remaining: int
    completion_rate: float


class AnalyticsCountItem(BaseModel):
    label: str
    total: int
    completed: int
    remaining: int


class ContentTypeCount(BaseModel):
    content_type: str
    count: int


class WeekdayCount(BaseModel):
    weekday: str
    count: int
