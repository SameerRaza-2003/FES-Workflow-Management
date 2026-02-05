from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TaskCommentCreate(BaseModel):
    content: str = Field(..., min_length=1, description="Comment text")


class TaskCommentResponse(BaseModel):
    id: str
    task_id: str
    author_id: str
    author_role: str
    content: str
    created_at: datetime
