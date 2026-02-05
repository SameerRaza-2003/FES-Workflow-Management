from motor.motor_asyncio import AsyncIOMotorDatabase


class AnalyticsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["tasks"]

    async def overview(self):
        total = await self.collection.count_documents({})
        completed = await self.collection.count_documents(
            {"design_status": "Completed"}
        )
        remaining = total - completed

        return {
            "total_tasks": total,
            "completed": completed,
            "remaining": remaining,
            "completion_rate": round((completed / total) * 100, 1) if total else 0,
        }

    async def by_field(self, field: str):
        pipeline = [
            {
                "$group": {
                    "_id": f"${field}",
                    "total": {"$sum": 1},
                    "completed": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$design_status", "Completed"]},
                                1,
                                0,
                            ]
                        }
                    },
                }
            }
        ]

        results = await self.collection.aggregate(pipeline).to_list(None)

        return [
            {
                "label": r["_id"] or "Unassigned",
                "total": r["total"],
                "completed": r["completed"],
                "remaining": r["total"] - r["completed"],
            }
            for r in results
        ]

    async def by_content_type(self):
        pipeline = [
            {
                "$group": {
                    "_id": "$content_type",
                    "count": {"$sum": 1},
                }
            }
        ]

        results = await self.collection.aggregate(pipeline).to_list(None)

        return [
            {
                "content_type": r["_id"] or "Unknown",
                "count": r["count"],
            }
            for r in results
        ]
