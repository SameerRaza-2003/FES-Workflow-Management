from datetime import datetime
from typing import List

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class NotificationRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["notifications"]

    async def create(
        self,
        user_id: ObjectId,
        type: str,
        message: str,
        task_id: ObjectId | None = None,
    ) -> dict:
        result = await self.collection.insert_one(
            {
                "user_id": user_id,
                "type": type,
                "message": message,
                "task_id": task_id,
                "is_read": False,
                "created_at": datetime.utcnow(),
            }
        )
        return await self.collection.find_one({"_id": result.inserted_id})

    async def list_for_user(
        self,
        user_id: ObjectId,
        limit: int = 50,
    ) -> List[dict]:
        return await self.collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit).to_list(length=limit)

    async def mark_read(self, notification_id: ObjectId) -> None:
        await self.collection.update_one(
            {"_id": notification_id},
            {"$set": {"is_read": True}},
        )
