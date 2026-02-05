from app.db.mongo import get_db

class UserRepository:

    @staticmethod
    async def find_by_email(email: str):
        db = get_db()
        return await db.users.find_one({"email": email})

    @staticmethod
    async def create(user: dict):
        db = get_db()
        await db.users.insert_one(user)

    @staticmethod
    async def list_designers():
        """List all users with designer role"""
        db = get_db()
        # Exclude both possible password field names
        cursor = db.users.find(
            {"role": "designer"}, 
            {"password_hash": 0, "hashed_password": 0}
        )
        return await cursor.to_list(length=100)

    @staticmethod
    async def list_by_role(role: str):
        """List all users by role"""
        db = get_db()
        cursor = db.users.find({"role": role}, {"password_hash": 0})
        return await cursor.to_list(length=100)
