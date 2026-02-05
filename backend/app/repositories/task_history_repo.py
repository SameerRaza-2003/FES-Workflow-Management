from datetime import datetime
from typing import List

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class TaskHistoryRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["task_history"]

    # ---------- WRITE ----------

    async def log(
        self,
        task_id: ObjectId,
        action: str,
        performed_by: ObjectId,
        role: str,
        comment: str | None = None,
    ) -> None:
        await self.collection.insert_one(
            {
                "task_id": task_id,
                "action": action,
                "performed_by": performed_by,
                "role": role,
                "comment": comment,
                "created_at": datetime.utcnow(),
            }
        )

    # ---------- READ ----------

    async def list_for_task(
        self,
        task_id: ObjectId,
        limit: int = 100,
    ) -> List[dict]:
        return await self.collection.find(
            {"task_id": task_id}
        ).sort("created_at", 1).to_list(length=limit)
