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
    ADMIN_APPROVED = "AdminApproved"  # Layer 1: Admin approved, awaiting Approver
    APPROVED = "Approved"  # Layer 2: Fully approved by Approver
    CHANGES_REQUIRED = "ChangesRequired"
    REJECTED = "Rejected"
    ON_HOLD = "OnHold"


class PostingStatus(str, Enum):
    DRAFT = "Draft"
    SCHEDULED = "Scheduled"
    POSTED = "Posted"
    FAILED = "Failed"


class ContentForEntity(str, Enum):
    FES = "FES"
    FES_UAE = "FES UAE"
    DAPHNE_BY_MONA = "Daphne by Mona"
    HAITHAM_COLLEGE = "Haitham College"
    FES_AID = "FES AID"
    IELTS_BY_FES = "IELTS by FES"


class DesignerUpload(BaseModel):
    url: str
    uploaded_at: datetime
    revision: int = 1


class TaskBase(BaseModel):
    content_type: str = Field(..., description="Content Type from Excel")
    size: Optional[str] = None
    title: str
    content: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    tags: List[str] = []
    content_for: Optional[ContentForEntity] = None
    is_urgent: bool = False
    reference_images: List[str] = []


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    """Partial update model for admin edits"""
    title: Optional[str] = None
    content: Optional[str] = None
    instructions: Optional[str] = None
    deadline: Optional[datetime] = None
    tags: Optional[List[str]] = None
    content_for: Optional[ContentForEntity] = None
    is_urgent: Optional[bool] = None
    reference_images: Optional[List[str]] = None


class TaskInDB(TaskBase):
    id: ObjectId = Field(alias="_id")
    task_number: int = 0

    assigned_by_id: ObjectId
    designer_id: Optional[ObjectId] = None

    design_status: DesignStatus = DesignStatus.PENDING
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    posting_status: PostingStatus = PostingStatus.DRAFT

    designer_uploads: List[DesignerUpload] = []

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        populate_by_name=True,
        from_attributes=True,
    )


class TaskResponse(TaskBase):
    id: str
    task_number: int = 0
    assigned_by_id: str
    designer_id: Optional[str]
    
    # Human-readable names (resolved from IDs)
    assigned_by_name: Optional[str] = None
    designer_name: Optional[str] = None

    design_status: DesignStatus
    approval_status: ApprovalStatus
    posting_status: PostingStatus
    
    approval_comment: Optional[str] = None
    designer_uploads: List[DesignerUpload] = []

    created_at: datetime
    updated_at: datetime
