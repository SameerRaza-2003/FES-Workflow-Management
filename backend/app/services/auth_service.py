from app.repositories.user_repo import UserRepository
from app.core.security import hash_password, verify_password, create_access_token
from fastapi import HTTPException

class AuthService:

    @staticmethod
    async def register(user_data):
        # Check if email already exists
        existing = await UserRepository.find_by_email(user_data.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed = hash_password(user_data.password)

        user = {
            "full_name": user_data.full_name,
            "email": user_data.email,
            "hashed_password": hashed,
            "role": user_data.role,
            "active": True
        }

        await UserRepository.create(user)
        return {"message": "User registered successfully"}

    @staticmethod
    async def login(email: str, password: str):
        user = await UserRepository.find_by_email(email)

        if not user or not verify_password(password, user["hashed_password"]):
            raise Exception("Invalid credentials")

        token = create_access_token({
            "sub": str(user["_id"]),
            "role": user["role"]
        })

        # Return complete user data for frontend
        return {
            "access_token": token,
            "user_id": str(user["_id"]),
            "email": user["email"],
            "full_name": user.get("full_name", email.split("@")[0]),
            "role": user["role"]
        }
