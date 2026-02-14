import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import settings

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp"}


def _configure_cloudinary():
    if not settings.CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=500, detail="Cloudinary not configured")

    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    """
    Upload an image to Cloudinary.
    Accepts png, jpg, webp.  Returns ``{url, public_id}``.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: png, jpg, webp",
        )

    _configure_cloudinary()

    try:
        contents = await file.read()
        result = cloudinary.uploader.upload(
            contents,
            folder="fes-workflow",
            resource_type="image",
        )

        return {
            "url": result["secure_url"],
            "public_id": result["public_id"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
