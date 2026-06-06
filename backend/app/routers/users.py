from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.dependencies import get_current_user, require_roles
from app.db.mongo import get_db
from app.repositories.user_repo import UserRepository

router = APIRouter(prefix="/users", tags=["Users"])

@router.get(
    "/designers",
    summary="List all designers",
    description="Returns a list of all users with the designer role. Requires authentication.",
)
async def list_designers(current_user: dict = Depends(get_current_user)):
    """Get list of all designers for dropdown/assignment purposes"""
    designers = await UserRepository.list_designers()
    
    # Convert ObjectId to string for JSON serialization
    result = []
    for d in designers:
        result.append({
            "id": str(d["_id"]),
            "email": d.get("email", ""),
            "full_name": d.get("full_name", d.get("email", "Designer")),
            "role": d.get("role", "designer"),
        })
    
    return result


@router.get(
    "/all",
    summary="List all users",
    description="Returns a list of all users. Requires authentication.",
)
async def list_all_users(current_user: dict = Depends(get_current_user)):
    """Get list of all users for assignment dropdowns"""
    users = await UserRepository.list_all()
    return [
        {
            "id": str(u["_id"]),
            "email": u.get("email", ""),
            "full_name": u.get("full_name", u.get("email", "User")),
            "role": u.get("role", ""),
            "phone": u.get("phone"),
        }
        for u in users
    ]


# ─────────────────────────────────────────────────────────
# PHONE NUMBER MANAGEMENT (for WhatsApp integration)
# ─────────────────────────────────────────────────────────

class UpdatePhoneRequest(BaseModel):
    phone: str  # E.164 format, e.g. "+923001234567"


@router.patch(
    "/{user_id}/phone",
    summary="Set user phone number (Admin only)",
    description="Set or update a user's WhatsApp phone number. Admin only.",
)
async def update_user_phone(
    user_id: str,
    payload: UpdatePhoneRequest,
    current_user: dict = Depends(require_roles("admin")),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Set or update a user's phone number for WhatsApp integration."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await db["users"].update_one(
        {"_id": oid},
        {"$set": {"phone": payload.phone}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"status": "updated", "user_id": user_id, "phone": payload.phone}
