from typing import List, Dict, Any
from pydantic import BaseModel


class TaskImportRow(BaseModel):
    row_number: int
    data: Dict[str, Any]


class TaskImportPreviewResponse(BaseModel):
    total_rows: int
    rows: List[TaskImportRow]
