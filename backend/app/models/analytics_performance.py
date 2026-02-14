from pydantic import BaseModel
from typing import Optional


class DesignerPerformance(BaseModel):
    designer_id: str
    designer_name: Optional[str] = None
    completed: int
    pending: int
    total: int
    completion_rate: float


class MyPerformance(BaseModel):
    completed: int
    pending: int
    total: int
    completion_rate: float


class AssignerPerformance(BaseModel):
    assigner_id: str
    assigner_name: Optional[str] = None
    total_assigned: int
    completed: int
    approved: int
    pending_approval: int
    in_progress: int
    approval_rate: float
