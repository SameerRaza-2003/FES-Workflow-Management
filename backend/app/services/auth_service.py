from app.repositories.user_repo import UserRepository
from app.core.security import hash_password, verify_password, create_access_token

class AuthService:

    @staticmethod
    async def register(user_data):
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

        return {"access_token": token}
