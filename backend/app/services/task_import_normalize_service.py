from typing import List, Dict, Any
from fastapi import HTTPException, status


class TaskImportNormalizeService:
    COLUMN_MAP = {
        "  ": "content_type",          # IMPORTANT FIX
        "Content Type": "content_type",
        "Content Title": "title",
        "Content": "content",
        "Instructions For Designer": "instructions",
        "Designer Name": "designer_name",
        "Assigned By": "assigned_by",
        "Assigned Date": "assigned_date",
        "Completion Date": "completion_date",
        "Deadline": "deadline",
        "Design Status": "design_status",
        "Approval Status": "approval_status",
        "Posting Status": "posting_status",
        "Captions": "captions",
        "Design Drive Link": "design_drive_link",
        "Size": "size",
    }

    STATUS_FIELDS = {
        "design_status",
        "approval_status",
        "posting_status",
    }

    def normalize(self, rows: List[dict]) -> List[dict]:
        if not isinstance(rows, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expected a list of rows",
            )

        normalized_rows = []

        for row in rows:
            if not isinstance(row, dict):
                continue

            if "row_number" not in row or "data" not in row:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Each row must contain 'row_number' and 'data'",
                )

            if not isinstance(row["data"], dict):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="'data' must be an object",
                )

            normalized_data: Dict[str, Any] = {}
            extra_data: Dict[str, Any] = {}

            for excel_key, value in row["data"].items():
                if not isinstance(excel_key, str):
                    continue

                excel_key = excel_key.strip()

                backend_key = self.COLUMN_MAP.get(excel_key)

                if isinstance(value, str):
                    value = value.strip() or None

                if backend_key:
                    if backend_key in self.STATUS_FIELDS and isinstance(value, str):
                        value = value.capitalize()

                    normalized_data[backend_key] = value
                else:
                    # LENIENT MODE: preserve unknown columns
                    extra_data[excel_key] = value

            normalized_data["extra_data"] = extra_data

            normalized_rows.append(
                {
                    "row_number": row["row_number"],
                    "data": normalized_data,
                }
            )

        return normalized_rows
