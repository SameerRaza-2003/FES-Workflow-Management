from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class TaskRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["tasks"]

    async def create(self, data: dict) -> dict:
        now = datetime.utcnow()
        data["created_at"] = now
        data["updated_at"] = now

        result = await self.collection.insert_one(data)
        return await self.collection.find_one({"_id": result.inserted_id})

    async def get_by_id(self, task_id: str) -> dict | None:
        try:
            oid = ObjectId(task_id)
        except Exception:
            return None

        return await self.collection.find_one({"_id": oid})

    async def list(self, limit: int = 100) -> list[dict]:
        return await self.collection.find().limit(limit).to_list(length=limit)

    async def update(self, task_id: str, data: dict) -> dict | None:
        try:
            oid = ObjectId(task_id)
        except Exception:
            return None

        data["updated_at"] = datetime.utcnow()

        result = await self.collection.update_one(
            {"_id": oid},
            {"$set": data},
        )

        if result.matched_count == 0:
            return None

        return await self.collection.find_one({"_id": oid})

    async def assign_designer(
        self,
        task_id: str,
        designer_id: ObjectId,
    ) -> dict | None:
        return await self.update(
            task_id,
            {"designer_id": designer_id},
        )
