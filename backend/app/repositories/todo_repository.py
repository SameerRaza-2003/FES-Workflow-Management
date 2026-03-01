from datetime import datetime, timedelta
from typing import List, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class TodoRepository:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["todos"]

    # ---------- CREATE ----------

    async def create(self, data: dict) -> dict:
        now = datetime.utcnow()
        data["created_at"] = now
        data["updated_at"] = now
        data["status"] = data.get("status", "todo")
        data["reminder_sent"] = False

        result = await self.collection.insert_one(data)
        return await self.collection.find_one({"_id": result.inserted_id})

    # ---------- READ ----------

    async def get_by_id(self, todo_id: str) -> Optional[dict]:
        try:
            oid = ObjectId(todo_id)
        except Exception:
            return None
        return await self.collection.find_one({"_id": oid})

    async def list_for_user(
        self,
        user_id: str,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        limit: int = 200,
    ) -> List[dict]:
        """Return todos created by OR assigned to this user."""
        query: dict = {
            "$or": [
                {"created_by": user_id},
                {"assigned_to": user_id},
                {"visible_to_all": True},
            ]
        }
        if status:
            query["status"] = status
        if priority:
            query["priority"] = priority

        return await (
            self.collection.find(query)
            .sort([("due_date", 1), ("created_at", -1)])
            .limit(limit)
            .to_list(length=limit)
        )

    async def list_today(self, user_id: str) -> List[dict]:
        """Todos due today (not done)."""
        now = datetime.utcnow()
        start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)

        return await self.collection.find({
            "$or": [
                {"created_by": user_id},
                {"assigned_to": user_id},
            ],
            "status": {"$ne": "done"},
            "due_date": {"$gte": start, "$lt": end},
        }).sort("due_date", 1).to_list(length=200)

    async def list_upcoming(self, user_id: str, days: int = 7) -> List[dict]:
        """Todos due in the next N days (not done, excluding today)."""
        now = datetime.utcnow()
        tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = now + timedelta(days=days)

        return await self.collection.find({
            "$or": [
                {"created_by": user_id},
                {"assigned_to": user_id},
            ],
            "status": {"$ne": "done"},
            "due_date": {"$gte": tomorrow, "$lte": end},
        }).sort("due_date", 1).to_list(length=200)

    async def list_overdue(self, user_id: str) -> List[dict]:
        """Todos past due and not done."""
        now = datetime.utcnow()
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        return await self.collection.find({
            "$or": [
                {"created_by": user_id},
                {"assigned_to": user_id},
            ],
            "status": {"$ne": "done"},
            "due_date": {"$lt": start_of_today},
        }).sort("due_date", 1).to_list(length=200)

    async def list_due_reminders(self) -> List[dict]:
        """Todos with reminder_datetime <= now and not yet sent."""
        now = datetime.utcnow()
        return await self.collection.find({
            "reminder_datetime": {"$lte": now},
            "reminder_sent": {"$ne": True},
            "status": {"$ne": "done"},
        }).to_list(length=100)

    async def mark_reminder_sent(self, todo_id: ObjectId) -> None:
        await self.collection.update_one(
            {"_id": todo_id},
            {"$set": {"reminder_sent": True}},
        )

    # ---------- UPDATE ----------

    async def update(self, todo_id: str, data: dict) -> Optional[dict]:
        try:
            oid = ObjectId(todo_id)
        except Exception:
            return None

        data["updated_at"] = datetime.utcnow()

        # If reminder_datetime changed, reset reminder_sent
        if "reminder_datetime" in data:
            data["reminder_sent"] = False

        result = await self.collection.update_one(
            {"_id": oid},
            {"$set": data},
        )
        if result.matched_count == 0:
            return None
        return await self.collection.find_one({"_id": oid})

    # ---------- DELETE ----------

    async def delete(self, todo_id: str) -> bool:
        try:
            oid = ObjectId(todo_id)
        except Exception:
            return False
        result = await self.collection.delete_one({"_id": oid})
        return result.deleted_count > 0
