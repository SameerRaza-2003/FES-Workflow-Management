from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class SocialConnectionRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["social_connections"]

    async def create(self, user_id: str, data: dict) -> dict:
        now = datetime.utcnow()
        data["user_id"] = ObjectId(user_id)
        data["connected_at"] = now
        data["updated_at"] = now

        result = await self.collection.insert_one(data)
        return await self.collection.find_one({"_id": result.inserted_id})

    async def get_by_id(self, connection_id: str) -> Optional[dict]:
        try:
            oid = ObjectId(connection_id)
        except:
            return None
        return await self.collection.find_one({"_id": oid})

    async def get_user_connections(self, user_id: str) -> List[dict]:
        try:
            user_oid = ObjectId(user_id)
        except:
            return []
        return await self.collection.find({"user_id": user_oid}).to_list(length=50)

    async def get_by_platform(self, user_id: str, platform: str) -> Optional[dict]:
        try:
            user_oid = ObjectId(user_id)
        except:
            return None
        return await self.collection.find_one({
            "user_id": user_oid,
            "platform": platform
        })

    async def update_tokens(
        self,
        connection_id: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        token_expires_at: Optional[datetime] = None
    ) -> Optional[dict]:
        try:
            oid = ObjectId(connection_id)
        except:
            return None

        update_data = {
            "access_token": access_token,
            "updated_at": datetime.utcnow()
        }
        if refresh_token:
            update_data["refresh_token"] = refresh_token
        if token_expires_at:
            update_data["token_expires_at"] = token_expires_at

        await self.collection.update_one(
            {"_id": oid},
            {"$set": update_data}
        )
        return await self.collection.find_one({"_id": oid})

    async def delete(self, connection_id: str) -> bool:
        try:
            oid = ObjectId(connection_id)
        except:
            return False
        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count > 0

    async def delete_by_platform(self, user_id: str, platform: str) -> bool:
        try:
            user_oid = ObjectId(user_id)
        except:
            return False
        result = await self.collection.delete_one({
            "user_id": user_oid,
            "platform": platform
        })
        return result.deleted_count > 0
