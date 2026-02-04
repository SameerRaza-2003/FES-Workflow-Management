from enum import Enum
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict
from bson import ObjectId


class DesignStatus(str, Enum):
    PENDING = "Pending"
    WORKING = "Working"
    ON_HOLD = "OnHold"
    COMPLETED = "Completed"
    DISCARDED = "Discarded"
    NOT_COMPLETED = "NotCompleted"


class ApprovalStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    CHANGES_REQUIRED = "ChangesRequired"
    REJECTED = "Rejected"
    ON_HOLD = "OnHold"


class PostingStatus(str, Enum):
    DRAFT = "Draft"
    SCHEDULED = "Scheduled"
    POSTED = "Posted"
    FAILED = "Failed"


class TaskBase(BaseModel):
    content_type: str = Field(..., description="Content Type from Excel")
    size: Optional[str] = None
    title: str
    content: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    tags: List[str] = []


class TaskCreate(TaskBase):
    pass


class TaskInDB(TaskBase):
    id: ObjectId = Field(alias="_id")

    assigned_by_id: ObjectId
    designer_id: Optional[ObjectId] = None

    design_status: DesignStatus = DesignStatus.PENDING
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    posting_status: PostingStatus = PostingStatus.DRAFT

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        from_attributes=True,
    )


class TaskResponse(TaskBase):
    id: str
    assigned_by_id: str
    designer_id: Optional[str]

    design_status: DesignStatus
    approval_status: ApprovalStatus
    posting_status: PostingStatus

    created_at: datetime
    updated_at: datetime
