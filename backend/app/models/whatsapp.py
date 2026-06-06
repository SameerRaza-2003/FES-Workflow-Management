from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class WhatsAppSession(BaseModel):
    """Tracks multi-step conversation state per phone number."""
    phone: str
    flow: Optional[str] = None  # e.g. "creating_task", "selecting_task"
    step: Optional[str] = None  # current step in the flow
    data: dict = {}             # partial data collected so far
    task_refs: dict = {}        # numbered refs, e.g. {"1": "ObjectId...", "2": "..."}
    last_active_task_id: Optional[str] = None
    updated_at: Optional[float] = None  # timestamp

    class Config:
        extra = "allow"


class SendMessageRequest(BaseModel):
    """Request body for POST /whatsapp/send."""
    to: str          # E.164 phone number
    body: str
    media_url: Optional[str] = None


class WhatsAppIntent(str, Enum):
    GREETING = "greeting"
    HELP = "help"
    CREATE = "create"
    ASSIGN = "assign"
    APPROVE = "approve"
    REJECT = "reject"
    PENDING = "pending"
    MY_TASKS = "my_tasks"
    STATUS = "status"
    DONE = "done"
    UPLOAD = "upload"
    CANCEL = "cancel"
    UNKNOWN = "unknown"
