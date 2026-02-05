from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
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
