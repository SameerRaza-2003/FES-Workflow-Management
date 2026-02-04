from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class TaskHistoryRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["task_history"]

    async def log(
        self,
        task_id: ObjectId,
        action: str,
        performed_by: ObjectId,
        role: str,
        comment: str | None = None,
    ):
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

    async def list_for_task(self, task_id: str):
        return await self.collection.find(
            {"task_id": ObjectId(task_id)}
        ).sort("created_at", 1).to_list(length=100)
