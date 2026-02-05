from datetime import datetime
from typing import List

from fastapi import HTTPException, status

from app.models.task import DesignStatus, ApprovalStatus, PostingStatus
from app.models.task_import_validation import (
    TaskImportValidationError,
    TaskImportValidationResponse,
)


REQUIRED_FIELDS = {"content_type", "title"}


class TaskImportValidationService:
    def validate(self, rows: List[dict]) -> TaskImportValidationResponse:
        if not isinstance(rows, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload format. Expected a list of rows.",
            )

        errors: List[TaskImportValidationError] = []

        for idx, row in enumerate(rows):
            if "row_number" not in row or "data" not in row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each row must contain 'row_number' and 'data'",
                )

            row_errors: List[str] = []
            row_number = row["row_number"]
            data = row["data"]

            # -------- REQUIRED FIELDS --------
            for field in REQUIRED_FIELDS:
                if not data.get(field):
                    row_errors.append(f"Missing required field: {field}")

            # -------- ENUMS --------
            if "design_status" in data and data["design_status"]:
                if data["design_status"] not in DesignStatus._value2member_map_:
                    row_errors.append(
                        f"Invalid design_status: {data['design_status']}"
                    )

            if "approval_status" in data and data["approval_status"]:
                if data["approval_status"] not in ApprovalStatus._value2member_map_:
                    row_errors.append(
                        f"Invalid approval_status: {data['approval_status']}"
                    )

            if "posting_status" in data and data["posting_status"]:
                if data["posting_status"] not in PostingStatus._value2member_map_:
                    row_errors.append(
                        f"Invalid posting_status: {data['posting_status']}"
                    )

            # -------- DATE --------
            if "deadline" in data and data["deadline"]:
                try:
                    if isinstance(data["deadline"], str):
                        datetime.fromisoformat(data["deadline"])
                except Exception:
                    row_errors.append("Invalid deadline format (ISO required)")

            if row_errors:
                errors.append(
                    TaskImportValidationError(
                        row_number=row_number,
                        errors=row_errors,
                    )
                )

        total_rows = len(rows)
        invalid_rows = len(errors)
        valid_rows = total_rows - invalid_rows

        return TaskImportValidationResponse(
            total_rows=total_rows,
            valid_rows=valid_rows,
            invalid_rows=invalid_rows,
            errors=errors,
        )
