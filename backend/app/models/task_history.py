from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class TaskHistoryResponse(BaseModel):
    id: str
    task_id: str
    action: str
    performed_by: str
    performed_by_name: Optional[str] = None  # Human-readable name
    role: str
    comment: Optional[str] = None
    created_at: datetime

