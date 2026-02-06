from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str
    message: str
    task_id: Optional[str] = None
    is_read: bool
    created_at: datetime
    
    # Enhanced notification fields
    actor_name: Optional[str] = None  # Who performed the action
    actor_role: Optional[str] = None  # Their role (Admin, Approver, etc.)
    action: Optional[str] = None      # What action was performed
    task_title: Optional[str] = None  # Task title for context

