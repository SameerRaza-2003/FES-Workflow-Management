from datetime import date
from motor.motor_asyncio import AsyncIOMotorDatabase


class PriorityService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["tasks"]

    def _urgency_score(self, days: int | None) -> int:
        if days is None:
            return 0
        if days <= 0:
            return 100
        if days <= 1:
            return 90
        if days <= 3:
            return 80
        if days <= 7:
            return 60
        if days <= 14:
            return 40
        if days <= 30:
            return 20
        return 0

    async def get_priority_tasks(
        self,
        limit: int = 10,
        event_boost: int = 50,
    ):
        today = date.today()

        tasks = await self.collection.find(
            {"design_status": {"$ne": "Completed"}}
        ).to_list(None)

        results = []

        for t in tasks:
            deadline = t.get("deadline")
            days_left = None

            if deadline:
                try:
                    days_left = (deadline.date() - today).days
                except Exception:
                    days_left = None

            urgency = self._urgency_score(days_left)

            content_type = (t.get("content_type") or "").lower()
            is_event_cover = "event cover" in content_type

            priority = urgency + (event_boost if is_event_cover else 0)

            results.append(
                {
                    "task_id": str(t["_id"]),
                    "title": t.get("title"),
                    "content_type": t.get("content_type"),
                    "designer_id": str(t["designer_id"]) if t.get("designer_id") else None,
                    "assigned_by_id": str(t["assigned_by_id"]),
                    "deadline": deadline.date() if deadline else None,
                    "days_to_deadline": days_left,
                    "urgency_score": urgency,
                    "event_cover": is_event_cover,
                    "priority_score": priority,
                }
            )

        results.sort(
            key=lambda x: (x["priority_score"], -(x["days_to_deadline"] or 9999)),
            reverse=True,
        )

        return results[:limit]
