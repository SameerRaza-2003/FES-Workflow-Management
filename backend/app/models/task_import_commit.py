from typing import List, Dict, Any
from pydantic import BaseModel


class TaskImportCommitRow(BaseModel):
    row_number: int
    data: Dict[str, Any]


class TaskImportCommitResponse(BaseModel):
    total_rows: int
    created: int
    failed: int
    failed_rows: List[int]
