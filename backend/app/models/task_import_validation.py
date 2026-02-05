from typing import List
from pydantic import BaseModel


class TaskImportValidationError(BaseModel):
    row_number: int
    errors: List[str]


class TaskImportValidationResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    errors: List[TaskImportValidationError]
