from pydantic import BaseModel


class DesignerPerformance(BaseModel):
    designer_id: str
    completed: int
    pending: int
    total: int
    completion_rate: float


class MyPerformance(BaseModel):
    completed: int
    pending: int
    total: int
    completion_rate: float
