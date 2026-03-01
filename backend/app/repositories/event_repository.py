from datetime import datetime
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class EventRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["events"]

    # ---------- CREATE ----------

    async def create(self, data: dict) -> dict:
        data["created_at"] = datetime.utcnow()

        result = await self.collection.insert_one(data)
        return await self.collection.find_one({"_id": result.inserted_id})

    # ---------- READ ----------

    async def get_by_id(self, event_id: str) -> Optional[dict]:
        try:
            oid = ObjectId(event_id)
        except Exception:
            return None
        return await self.collection.find_one({"_id": oid})

    async def list_by_month(
        self,
        year: int,
        month: int,
    ) -> List[dict]:
        """All events in a given month (team-wide calendar)."""
        start = datetime(year, month, 1)
        if month == 12:
            end = datetime(year + 1, 1, 1)
        else:
            end = datetime(year, month + 1, 1)

        return await self.collection.find({
            "start_datetime": {"$lt": end},
            "end_datetime": {"$gte": start},
        }).sort("start_datetime", 1).to_list(length=500)

    async def list_by_day(
        self,
        date: datetime,
    ) -> List[dict]:
        """All events on a specific day (team-wide)."""
        start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        from datetime import timedelta
        end = start + timedelta(days=1)

        return await self.collection.find({
            "start_datetime": {"$lt": end},
            "end_datetime": {"$gte": start},
        }).sort("start_datetime", 1).to_list(length=100)

    # ---------- UPDATE ----------

    async def update(self, event_id: str, data: dict) -> Optional[dict]:
        try:
            oid = ObjectId(event_id)
        except Exception:
            return None

        result = await self.collection.update_one(
            {"_id": oid},
            {"$set": data},
        )
        if result.matched_count == 0:
            return None
        return await self.collection.find_one({"_id": oid})

    # ---------- DELETE ----------

    async def delete(self, event_id: str) -> bool:
        try:
            oid = ObjectId(event_id)
        except Exception:
            return False
        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count > 0
