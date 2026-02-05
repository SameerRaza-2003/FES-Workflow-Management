from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.task import DesignStatus


class AnalyticsPerformanceService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["tasks"]

    # ---------------- ADMIN ----------------

    async def performance_by_designer(self) -> list[dict]:
        pipeline = [
            {
                "$group": {
                    "_id": "$designer_id",
                    "total": {"$sum": 1},
                    "completed": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$design_status", DesignStatus.COMPLETED]},
                                1,
                                0,
                            ]
                        }
                    },
                }
            }
        ]

        results = []
        async for row in self.collection.aggregate(pipeline):
            total = row["total"]
            completed = row["completed"]
            pending = total - completed

            results.append(
                {
                    "designer_id": str(row["_id"]) if row["_id"] else "unassigned",
                    "completed": completed,
                    "pending": pending,
                    "total": total,
                    "completion_rate": round((completed / total) * 100, 1)
                    if total > 0
                    else 0.0,
                }
            )

        return results

    # ---------------- DESIGNER ----------------

    async def my_performance(self, user: dict) -> dict:
        if user.get("role") != "Designer":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only designers can access this",
            )

        designer_id = ObjectId(user["_id"])

        total = await self.collection.count_documents(
            {"designer_id": designer_id}
        )

        completed = await self.collection.count_documents(
            {
                "designer_id": designer_id,
                "design_status": DesignStatus.COMPLETED,
            }
        )

        pending = total - completed

        return {
            "completed": completed,
            "pending": pending,
            "total": total,
            "completion_rate": round((completed / total) * 100, 1)
            if total > 0
            else 0.0,
        }
