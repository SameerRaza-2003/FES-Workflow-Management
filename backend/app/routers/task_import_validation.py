from fastapi import APIRouter, Depends
from typing import List

from app.core.dependencies import get_current_user
from app.models.task_import_validation import TaskImportValidationResponse
from app.services.task_import_validation_service import TaskImportValidationService
from app.services.task_import_normalize_service import TaskImportNormalizeService

router = APIRouter(
    prefix="/tasks/import",
    tags=["Tasks – Import"],
)


def get_validation_service() -> TaskImportValidationService:
    return TaskImportValidationService()


def get_normalize_service() -> TaskImportNormalizeService:
    return TaskImportNormalizeService()


@router.post(
    "/validate",
    response_model=TaskImportValidationResponse,
    summary="Validate imported task rows",
)
async def validate_task_import(
    rows: List[dict],
    current_user: dict = Depends(get_current_user),
    normalize_service: TaskImportNormalizeService = Depends(get_normalize_service),
    validation_service: TaskImportValidationService = Depends(get_validation_service),
):
    normalized_rows = normalize_service.normalize(rows)
    return validation_service.validate(normalized_rows)
