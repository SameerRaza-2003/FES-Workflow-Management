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
