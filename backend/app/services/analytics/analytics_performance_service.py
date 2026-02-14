from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
from typing import Optional

from app.models.task import DesignStatus, ApprovalStatus


class AnalyticsPerformanceService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.collection = db["tasks"]
        self.users_collection = db["users"]

    async def _get_user_names_map(self, user_ids: list) -> dict:
        """Get a map of user_id -> full_name for a list of user IDs"""
        if not user_ids:
            return {}
        
        # Filter out None and invalid ObjectIds
        valid_ids = []
        for uid in user_ids:
            if uid and uid != "unassigned":
                try:
                    valid_ids.append(ObjectId(uid) if isinstance(uid, str) else uid)
                except:
                    pass
        
        if not valid_ids:
            return {}
        
        users = await self.users_collection.find(
            {"_id": {"$in": valid_ids}},
            {"_id": 1, "full_name": 1, "email": 1}
        ).to_list(length=100)
        
        return {
            str(u["_id"]): u.get("full_name") or u.get("email", "").split("@")[0] or "Unknown"
            for u in users
        }

    # ---------------- ADMIN ----------------

    async def performance_by_designer(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> list[dict]:
        pipeline = []
        date_filter = self._build_date_filter(start_date, end_date)
        if date_filter:
            pipeline.append({"$match": date_filter})
        pipeline.append({
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
        })

        raw_results = []
        designer_ids = []
        async for row in self.collection.aggregate(pipeline):
            raw_results.append(row)
            if row["_id"]:
                designer_ids.append(row["_id"])

        # Get names map
        names_map = await self._get_user_names_map(designer_ids)

        results = []
        for row in raw_results:
            total = row["total"]
            completed = row["completed"]
            pending = total - completed
            designer_id = str(row["_id"]) if row["_id"] else "unassigned"

            results.append(
                {
                    "designer_id": designer_id,
                    "designer_name": names_map.get(designer_id, "Unassigned"),
                    "completed": completed,
                    "pending": pending,
                    "total": total,
                    "completion_rate": round((completed / total) * 100, 1)
                    if total > 0
                    else 0.0,
                }
            )

        return results

    async def performance_by_assigner(self, start_date: Optional[str] = None, end_date: Optional[str] = None) -> list[dict]:
        """Get performance metrics grouped by who assigned the tasks"""
        pipeline = []
        date_filter = self._build_date_filter(start_date, end_date)
        if date_filter:
            pipeline.append({"$match": date_filter})
        pipeline.append({
                "$group": {
                    "_id": "$assigned_by_id",
                    "total_assigned": {"$sum": 1},
                    "completed": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$design_status", DesignStatus.COMPLETED]},
                                1,
                                0,
                            ]
                        }
                    },
                    "approved": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$approval_status", ApprovalStatus.APPROVED]},
                                1,
                                0,
                            ]
                        }
                    },
                    "pending_approval": {
                        "$sum": {
                            "$cond": [
                                {"$in": ["$approval_status", [ApprovalStatus.PENDING, ApprovalStatus.ADMIN_APPROVED]]},
                                1,
                                0,
                            ]
                        }
                    },
                    "in_progress": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$design_status", "Working"]},
                                1,
                                0,
                            ]
                        }
                    },
                }
        })

        raw_results = []
        assigner_ids = []
        async for row in self.collection.aggregate(pipeline):
            raw_results.append(row)
            if row["_id"]:
                assigner_ids.append(row["_id"])

        # Get names map
        names_map = await self._get_user_names_map(assigner_ids)

        results = []
        for row in raw_results:
            assigner_id = str(row["_id"]) if row["_id"] else "unknown"
            total = row["total_assigned"]
            completed = row["completed"]
            approved = row["approved"]

            results.append(
                {
                    "assigner_id": assigner_id,
                    "assigner_name": names_map.get(assigner_id, "Unknown"),
                    "total_assigned": total,
                    "completed": completed,
                    "approved": approved,
                    "pending_approval": row["pending_approval"],
                    "in_progress": row["in_progress"],
                    "approval_rate": round((approved / total) * 100, 1)
                    if total > 0
                    else 0.0,
                }
            )

        return results

    # ---------------- DESIGNER ----------------

    async def my_performance(self, user: dict) -> dict:
        if str(user.get("role", "")).lower() != "designer":
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

    @staticmethod
    def _build_date_filter(start_date: Optional[str], end_date: Optional[str]) -> dict:
        """Build a MongoDB date range filter on created_at."""
        if not start_date and not end_date:
            return {}
        date_filter: dict = {}
        try:
            if start_date:
                date_filter["$gte"] = datetime.fromisoformat(start_date)
            if end_date:
                # End of day
                end_dt = datetime.fromisoformat(end_date)
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
                date_filter["$lte"] = end_dt
        except ValueError:
            return {}
        return {"created_at": date_filter} if date_filter else {}
