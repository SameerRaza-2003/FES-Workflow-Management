from pydantic import BaseModel
from typing import Optional, List


# ============= Caption Generator =============

class CaptionRequest(BaseModel):
    brand: str
    topic: str
    tone: str = "professional"
    platform: str = "general"

class CaptionResponse(BaseModel):
    caption: str


# ============= Task Description Generator =============

class TaskDescriptionRequest(BaseModel):
    title: str
    content_type: str = ""
    brand: str = ""

class TaskDescriptionResponse(BaseModel):
    description: str
    instructions: str


# ============= Comment Summarizer =============

class CommentItem(BaseModel):
    author: str
    role: str
    content: str

class SummarizeRequest(BaseModel):
    comments: List[CommentItem]
    task_title: str = ""

class SummarizeResponse(BaseModel):
    summary: str


# ============= Analytics Insights =============

class AnalyticsInsightsRequest(BaseModel):
    total_tasks: int = 0
    completed_tasks: int = 0
    completion_rate: float = 0.0
    overdue_count: int = 0
    at_risk_count: int = 0
    top_designer: Optional[str] = None
    top_designer_completed: int = 0
    avg_completion_days: Optional[float] = None
    designers_count: int = 0

class AnalyticsInsightsResponse(BaseModel):
    insights: str
