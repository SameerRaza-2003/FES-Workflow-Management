from fastapi import APIRouter, Depends, UploadFile, File

from app.core.dependencies import get_current_user
from app.models.task_import import TaskImportPreviewResponse
from app.services.task_import_service import TaskImportService

router = APIRouter(
    prefix="/tasks/import",
    tags=["Tasks – Import"],
)


def get_import_service() -> TaskImportService:
    return TaskImportService()


@router.post(
    "/preview",
    response_model=TaskImportPreviewResponse,
    summary="Upload CSV/Excel and preview tasks",
)
async def preview_task_import(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    service: TaskImportService = Depends(get_import_service),
):
    return await service.preview(file)
