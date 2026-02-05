import io
from typing import List

import pandas as pd
from fastapi import HTTPException, UploadFile, status

from app.models.task_import import TaskImportRow, TaskImportPreviewResponse


class TaskImportService:
    async def preview(self, file: UploadFile) -> TaskImportPreviewResponse:
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file uploaded",
            )

        ext = file.filename.split(".")[-1].lower()

        try:
            content = await file.read()

            if ext == "csv":
                df = pd.read_csv(io.BytesIO(content))
            elif ext in {"xls", "xlsx"}:
                df = pd.read_excel(io.BytesIO(content))
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsupported file type",
                )

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse file: {str(e)}",
            )

        rows: List[TaskImportRow] = []

        for idx, record in df.iterrows():
            rows.append(
                TaskImportRow(
                    row_number=idx + 2,  # Excel row number (header = row 1)
                    data=record.to_dict(),
                )
            )

        return TaskImportPreviewResponse(
            total_rows=len(rows),
            rows=rows,
        )
