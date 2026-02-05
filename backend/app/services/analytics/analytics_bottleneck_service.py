from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.task import DesignStatus


class AnalyticsBottleneckService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["tasks"]

    # ---------------- DEADLINES ----------------

    async def overdue_tasks(self):
        now = datetime.utcnow()

        cursor = self.collection.find(
            {
                "deadline": {"$lt": now},
                "design_status": {"$ne": DesignStatus.COMPLETED},
            }
        )

        return await cursor.to_list(length=100)

    async def tasks_at_risk(self, days: int = 3):
        now = datetime.utcnow()
        soon = now + timedelta(days=days)

        cursor = self.collection.find(
            {
                "deadline": {"$gte": now, "$lte": soon},
                "design_status": {"$ne": DesignStatus.COMPLETED},
            }
        )

        return await cursor.to_list(length=100)

    # ---------------- DESIGNER LOAD ----------------

    async def designer_overload(self, threshold: int = 10):
        pipeline = [
            {
                "$match": {
                    "design_status": {
                        "$in": [
                            DesignStatus.PENDING,
                            DesignStatus.WORKING,
                        ]
                    }
                }
            },
            {
                "$group": {
                    "_id": "$designer_id",
                    "active_tasks": {"$sum": 1},
                }
            },
            {
                "$match": {
                    "active_tasks": {"$gte": threshold}
                }
            }
        ]

        results = []
        async for row in self.collection.aggregate(pipeline):
            results.append(
                {
                    "designer_id": str(row["_id"]),
                    "active_tasks": row["active_tasks"],
                }
            )

        return results

    # ---------------- STUCK TASKS ----------------

    async def stuck_tasks(self, days: int = 5):
        cutoff = datetime.utcnow() - timedelta(days=days)

        cursor = self.collection.find(
            {
                "design_status": DesignStatus.WORKING,
                "updated_at": {"$lte": cutoff},
            }
        )

        return await cursor.to_list(length=100)
