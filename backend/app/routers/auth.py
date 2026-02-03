from fastapi import APIRouter, HTTPException
from app.models.auth import LoginRequest, TokenResponse
from app.models.user import UserCreate
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
async def register(user: UserCreate):
    return await AuthService.register(user)

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    try:
        return await AuthService.login(data.email, data.password)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")
