from datetime import datetime
from typing import List

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class TaskCommentRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["task_comments"]

    async def create(
        self,
        task_id: ObjectId,
        author_id: ObjectId,
        author_role: str,
        content: str,
    ) -> dict:
        result = await self.collection.insert_one(
            {
                "task_id": task_id,
                "author_id": author_id,
                "author_role": author_role,
                "content": content,
                "created_at": datetime.utcnow(),
            }
        )

        return await self.collection.find_one({"_id": result.inserted_id})

    async def list_for_task(
        self,
        task_id: ObjectId,
        limit: int = 100,
    ) -> List[dict]:
        return await self.collection.find(
            {"task_id": task_id}
        ).sort("created_at", 1).to_list(length=limit)
