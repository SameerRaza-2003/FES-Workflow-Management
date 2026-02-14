from bson import ObjectId
from typing import List, Dict, Optional
from app.db.mongo import get_db

class UserRepository:

    @staticmethod
    async def find_by_email(email: str):
        db = get_db()
        return await db.users.find_one({"email": email})

    @staticmethod
    async def find_all_by_email(email: str):
        """Find ALL users with this email (to detect duplicates)"""
        db = get_db()
        cursor = db.users.find({"email": email})
        return await cursor.to_list(length=100)

    @staticmethod
    async def get_by_id(user_id: str) -> Optional[dict]:
        """Get a single user by ID"""
        db = get_db()
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        return await db.users.find_one(
            {"_id": oid}, 
            {"password_hash": 0, "hashed_password": 0}
        )

    @staticmethod
    async def get_names_map(user_ids: List[str]) -> Dict[str, str]:
        """
        Get a mapping of user_id -> full_name for multiple users.
        Useful for batch lookups when displaying tasks/comments/history.
        """
        db = get_db()
        
        # Convert to ObjectIds, filtering out invalid ones
        valid_oids = []
        for uid in user_ids:
            if uid:
                try:
                    valid_oids.append(ObjectId(uid))
                except Exception:
                    pass
        
        if not valid_oids:
            return {}
        
        cursor = db.users.find(
            {"_id": {"$in": valid_oids}},
            {"_id": 1, "full_name": 1, "email": 1}
        )
        users = await cursor.to_list(length=100)
        
        # Build map: id -> name (fallback to email prefix if no name)
        name_map = {}
        for u in users:
            uid_str = str(u["_id"])
            name = u.get("full_name") or u.get("email", "").split("@")[0] or "Unknown"
            name_map[uid_str] = name
        
        return name_map

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
        cursor = db.users.find({"role": role}, {"password_hash": 0, "hashed_password": 0})
        return await cursor.to_list(length=100)

