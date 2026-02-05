from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class TaskRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["tasks"]

    # ---------- CREATE ----------

    async def create(self, data: dict) -> dict:
        now = datetime.utcnow()
        data["created_at"] = now
        data["updated_at"] = now

        result = await self.collection.insert_one(data)
        return await self.collection.find_one({"_id": result.inserted_id})

    # ---------- READ ----------

    async def get_by_id(self, task_id: str) -> Optional[dict]:
        try:
            oid = ObjectId(task_id)
        except Exception:
            return None

        return await self.collection.find_one({"_id": oid})

    async def list(self, limit: int = 100) -> List[dict]:
        return await self.collection.find().limit(limit).to_list(length=limit)

    # ---------- UPDATE ----------

    async def update(self, task_id: str, data: dict) -> Optional[dict]:
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

    # ---------- ASSIGNMENT ----------

    async def assign_designer(
        self,
        task_id: str,
        designer_id: ObjectId,
    ) -> Optional[dict]:
        return await self.update(
            task_id,
            {"designer_id": designer_id},
        )

    # ---------- ROLE-BASED LISTS ----------

    async def list_for_designer(
        self,
        designer_id: ObjectId,
        limit: int = 100,
    ) -> List[dict]:
        return await self.collection.find(
            {
                "$or": [
                    {"designer_id": designer_id},
                    {"designer_id": str(designer_id)},
                ]
            }
        ).limit(limit).to_list(length=limit)

    async def list_pending_approval(
        self,
        limit: int = 100,
    ) -> List[dict]:
        return await self.collection.find(
            {
                "design_status": "Completed",
                "approval_status": "Pending",
            }
        ).limit(limit).to_list(length=limit)
