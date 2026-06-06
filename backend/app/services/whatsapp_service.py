"""
WhatsApp Service — core message handling for the Twilio WhatsApp integration.

Handles:
  • Incoming messages (text + media) from both DM and group chats
  • Command parsing (natural language)
  • Multi-step flows (task creation with reference images, notes)
  • Designer image uploads (Twilio → Cloudinary → task attachment)
  • Pending-tasks listing with images for admin/approver
  • Approve / reject via simple task numbers (#1, #2, …)
  • Outbound notifications
"""

import re
import time
import logging
from typing import Optional, List, Tuple
from datetime import datetime

import httpx
import cloudinary
import cloudinary.uploader
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.models.whatsapp import WhatsAppSession, WhatsAppIntent
from app.models.task import TaskCreate, DesignStatus, ApprovalStatus
from app.repositories.task_repo import TaskRepository
from app.repositories.task_history_repo import TaskHistoryRepository
from app.repositories.notification_repo import NotificationRepository
from app.services.task_service import TaskService
from app.services.task_history_service import TaskHistoryService
from app.services.notification_service import NotificationService
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────
# SESSION STORE  (in-memory, keyed by phone)
# ─────────────────────────────────────────────────────────
_sessions: dict[str, WhatsAppSession] = {}
SESSION_TIMEOUT = 600  # 10 minutes


def _get_session(phone: str) -> WhatsAppSession:
    now = time.time()
    sess = _sessions.get(phone)
    if sess and sess.updated_at and (now - sess.updated_at) > SESSION_TIMEOUT:
        sess = None
    if not sess:
        sess = WhatsAppSession(phone=phone)
    sess.updated_at = now
    _sessions[phone] = sess
    return sess


def _clear_session(phone: str):
    sess = _sessions.get(phone)
    if sess:
        sess.flow = None
        sess.step = None
        sess.data = {}
        sess.task_refs = {}
        sess.updated_at = time.time()


# ─────────────────────────────────────────────────────────
# INTENT PARSER
# ─────────────────────────────────────────────────────────

def parse_intent(body: str) -> Tuple[WhatsAppIntent, str]:
    """
    Parse the user message body into an intent + remaining text.
    Returns (intent, extra_text).
    """
    text = body.strip()
    
    # --- Strip WhatsApp quoted replies ---
    # Sometimes users quote the bot, which prefixes their message with the quoted text.
    # A standard heuristic is looking for standard WhatsApp "Reply to" formats or just
    # grabbing the very last line if it's a multi-line message where they replied at the bottom.
    lines = [L.strip() for L in text.splitlines() if L.strip()]
    if len(lines) > 1 and "Reply with a number" in text:
        # If the quoted message contains our common bot footer, try taking just the last line.
        text = lines[-1]
    
    lower = text.lower()

    # Strip group chat mentions and legacy prefixes
    prefixes = (
        "@fes chatbot ", "@feschatbot ", "@fes", "bot ", "fes:", "fes ", "chatbot "
    )
    for prefix in prefixes:
        if lower.startswith(prefix):
            text = text[len(prefix):].strip()
            lower = text.lower()
            break

    # --- Greeting ---
    if lower in ("hi", "hello", "hey", "salam", "assalam", "assalamualaikum", "aoa", "start"):
        return WhatsAppIntent.GREETING, ""

    # --- Help ---
    if lower in ("help", "commands", "menu", "?"):
        return WhatsAppIntent.HELP, ""

    # --- Cancel ---
    if lower in ("cancel", "stop", "exit", "quit", "nevermind"):
        return WhatsAppIntent.CANCEL, ""

    # --- Pending tasks ---
    if re.search(r"(pending|awaiting|approval\s*awaited|show\s*pending|pending\s*tasks)", lower):
        return WhatsAppIntent.PENDING, text

    # --- My tasks ---
    if re.search(r"(my\s*tasks?|tasks?|assigned)", lower):
        return WhatsAppIntent.MY_TASKS, text

    # --- Create task ---
    # Trigger if it starts with create/new/add OR if it contains keywords like "design", "banner", "post", "video"
    if re.match(r"^(create|new|add|make|design)\s*(a\s*)?(task|banner|post|video|flyer)?", lower):
        remaining = re.sub(r"^(create|new|add|make|design)\s*(a\s*)?(task|banner|post|video|flyer)?\s*:?\s*", "", text, flags=re.I)
        return WhatsAppIntent.CREATE, remaining.strip()
        
    # Catch-all implicit creation for common design phrases at the start
    if any(keyword in lower for keyword in ["banner design", "social media post", "flyer", "edit video"]):
        return WhatsAppIntent.CREATE, text

    # --- Assign ---
    m = re.match(r"^(assign)\s*#?(\d+)?\s*(to)?\s*(.*)", lower, re.DOTALL)
    if m:
        ref = m.group(2) or ""
        designer_name = m.group(4).strip() if m.group(4) else ""
        return WhatsAppIntent.ASSIGN, f"{ref}|{designer_name}" if ref else designer_name

    # --- Approve ---
    # Handles: "approve 1", "approve #1", "1 approved", "1 approve"
    m = re.search(r"(approve|accept|ok|yes|👍)\s*#?(\d+)|#?(\d+)\s*(approve|approved|accept|ok|yes|👍)", lower)
    if m:
        ref = m.group(2) or m.group(3) or ""
        return WhatsAppIntent.APPROVE, ref.strip()

    # --- Reject / request changes ---
    m = re.match(r"^(reject|changes?|request\s*changes?|no|👎)\s*#?(\d+)?\s*(.*)", lower, re.DOTALL)
    if m:
        ref = m.group(2) or ""
        comment = m.group(3).strip() if m.group(3) else ""
        return WhatsAppIntent.REJECT, f"{ref}|{comment}" if ref else comment

    # --- Status ---
    m = re.match(r"^(status|check|info)\s*#?(\d+)?\s*$", lower)
    if m:
        ref = m.group(2) or ""
        return WhatsAppIntent.STATUS, ref.strip()

    # --- Done / complete ---
    # Handles: "done 1", "1 done"
    m = re.search(r"(done|complete|finished|submit)\s*#?(\d+)|#?(\d+)\s*(done|complete|finished|submit)", lower)
    if m:
        ref = m.group(2) or m.group(3) or ""
        return WhatsAppIntent.DONE, ref.strip()

    # --- Plain number (session context) ---
    if re.match(r"^\d+$", lower):
        return WhatsAppIntent.UNKNOWN, text  # handled by session context

    return WhatsAppIntent.UNKNOWN, text


# ─────────────────────────────────────────────────────────
# CLOUDINARY HELPER
# ─────────────────────────────────────────────────────────

def _configure_cloudinary():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


async def _download_and_upload_to_cloudinary(media_url: str) -> str:
    """Download image from Twilio URL and re-upload to Cloudinary. Returns Cloudinary URL."""
    _configure_cloudinary()

    logger.info(f"Downloading media from Twilio: {media_url}")
    
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        logger.error("Missing Twilio credentials for media download.")
        raise ValueError("Missing Twilio credentials")

    # Twilio media URLs require basic auth
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                media_url,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                follow_redirects=True,
            )
            logger.info(f"Twilio download status: {resp.status_code}")
            resp.raise_for_status()
            
            logger.info(f"Downloaded {len(resp.content)} bytes from Twilio. Uploading to Cloudinary...")
            result = cloudinary.uploader.upload(
                resp.content,
                folder="fes-workflow/whatsapp",
                resource_type="image",
            )
            logger.info(f"Cloudinary upload success: {result.get('secure_url')}")
            return result["secure_url"]
        except Exception as e:
            logger.error(f"Error in Twilio->Cloudinary pipeline: {str(e)}")
            raise


# ─────────────────────────────────────────────────────────
# MAIN SERVICE CLASS
# ─────────────────────────────────────────────────────────

class WhatsAppService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.task_repo = TaskRepository(db)

        history_repo = TaskHistoryRepository(db)
        history_service = TaskHistoryService(history_repo)

        notification_repo = NotificationRepository(db)
        notification_service = NotificationService(notification_repo, db)
        
        self.ai_service = AIService()

        self.task_service = TaskService(
            self.task_repo, history_service, notification_service,
        )

    # ───── ENTRY POINT ─────

    async def handle_incoming(
        self,
        from_number: str,      # e.g. "whatsapp:+923001234567"
        body: str,
        media_urls: List[str],
        num_media: int,
        is_group: bool = False,
    ) -> str:
        """Process an incoming WhatsApp message. Returns the reply text."""

        # Extract clean phone (+923001234567)
        phone = from_number.replace("whatsapp:", "").strip()

        # Lookup user by phone
        user = await self._lookup_user(phone)
        if not user:
            return (
                "❌ Your phone number is not registered in the system.\n"
                "Please ask your admin to add your WhatsApp number to your account."
            )

        session = _get_session(phone)

        # ── MEDIA (images) ──
        if num_media > 0 and media_urls:
            return await self._handle_media(user, media_urls, body, session)

        # ── ACTIVE FLOW (multi-step) ──
        if session.flow:
            return await self._handle_session_flow(user, body, session)

        # ── PARSE INTENT ──
        intent, extra = parse_intent(body)

        handlers = {
            WhatsAppIntent.GREETING: lambda: self._handle_greeting(user),
            WhatsAppIntent.HELP: lambda: self._handle_help(user),
            WhatsAppIntent.CANCEL: lambda: self._handle_cancel(session),
            WhatsAppIntent.PENDING: lambda: self._handle_pending(user, session),
            WhatsAppIntent.MY_TASKS: lambda: self._handle_my_tasks(user, session),
            WhatsAppIntent.CREATE: lambda: self._handle_create_start(user, extra, session),
            WhatsAppIntent.ASSIGN: lambda: self._handle_assign_start(user, extra, session),
            WhatsAppIntent.APPROVE: lambda: self._handle_approve(user, extra, session),
            WhatsAppIntent.REJECT: lambda: self._handle_reject(user, extra, session),
            WhatsAppIntent.STATUS: lambda: self._handle_status(user, extra, session),
            WhatsAppIntent.DONE: lambda: self._handle_done(user, extra, session),
        }

        handler = handlers.get(intent)
        if handler:
            return await handler()

        # Might be a number selecting from a previous list
        if body.strip().isdigit():
            return await self._handle_number_selection(user, body.strip(), session)

        return (
            "🤔 I didn't understand that. Send *help* to see what I can do!"
        )

    # ───── USER LOOKUP ─────

    async def _lookup_user(self, phone: str) -> Optional[dict]:
        """Find user by phone number."""
        user = await self.db["users"].find_one({"phone": phone})
        return user

    # ───── GREETING ─────

    async def _handle_greeting(self, user: dict) -> str:
        name = user.get("full_name", "there")
        role = user.get("role", "user").title()
        return (
            f"👋 Hi *{name}*! ({role})\n\n"
            "Here's what you can do:\n"
            "📝 *create task* — Create a new task\n"
            "📋 *pending tasks* — View tasks awaiting approval\n"
            "🎨 *my tasks* — View your assigned tasks\n"
            "📸 *Send an image* — Upload a design\n"
            "✅ *approve #number* — Approve a task\n"
            "🔄 *reject #number reason* — Request changes\n"
            "✔️ *done #number* — Mark task complete\n"
            "📊 *status #number* — Check task status\n\n"
            "Send *help* anytime for this menu."
        )

    # ───── HELP ─────

    async def _handle_help(self, user: dict) -> str:
        role = user.get("role", "").lower()
        msg = "📖 *Available Commands:*\n\n"

        msg += "📝 *create task* — Start creating a new task\n"
        msg += "👤 *assign #N* — Assign task to a designer\n"
        msg += "📋 *my tasks* — View your tasks\n"
        msg += "📊 *status #N* — View task details\n"

        if role in ("admin", "approver", "assigner"):
            msg += "\n👨‍💼 *Admin/Approver Commands:*\n"
            msg += "📋 *pending tasks* — Tasks awaiting your approval\n"
            msg += "✅ *approve #N* — Approve a task\n"
            msg += "🔄 *reject #N reason* — Request changes\n"

        if role == "designer":
            msg += "\n🎨 *Designer Commands:*\n"
            msg += "📸 *Send image* — Upload design to your task\n"
            msg += "✔️ *done #N* — Mark task as complete\n"

        msg += "\n❌ *cancel* — Cancel current action"
        return msg

    # ───── CANCEL ─────

    async def _handle_cancel(self, session: WhatsAppSession) -> str:
        _clear_session(session.phone)
        return "✅ Cancelled. Send *help* to see available commands."

    # ───── MY TASKS ─────

    async def _handle_my_tasks(self, user: dict, session: WhatsAppSession) -> str:
        role = user.get("role", "").lower()
        user_id = user["_id"]

        if role == "designer":
            tasks = await self.task_service.my_tasks(user)
        else:
            tasks = await self.task_service.list_tasks()

        if not tasks:
            return "📭 No tasks found."

        session.task_refs = {}
        lines = [f"📋 *Your Tasks ({len(tasks)}):*\n"]
        for i, t in enumerate(tasks[:15], 1):
            tn = t.get("task_number", "?")
            title = t.get("title", "Untitled")
            ds = t.get("design_status", "?")
            ap = t.get("approval_status", "?")
            urgent = "🔴 " if t.get("is_urgent") else ""
            lines.append(f"{i}️⃣ {urgent}*#{tn}* — {title}\n   Design: {ds} | Approval: {ap}")
            session.task_refs[str(i)] = str(t["_id"])

        lines.append("\nReply with a number to see details.")
        return "\n".join(lines)

    # ───── PENDING TASKS (Admin / Approver) ─────

    async def _handle_pending(self, user: dict, session: WhatsAppSession) -> str:
        role = user.get("role", "").lower()

        if role == "admin":
            tasks = await self.task_repo.list_pending_admin_approval()
            header = "📋 *Pending Admin Approval"
        elif role in ("approver", "assigner"):
            tasks = await self.task_repo.list_pending_final_approval()
            header = "📋 *Pending Final Approval"
        else:
            return "⚠️ Only admins and approvers can view pending tasks."

        if not tasks:
            return "✅ No tasks pending your approval!"

        session.task_refs = {}
        lines = [f"{header} ({len(tasks)}):*\n"]

        for i, t in enumerate(tasks[:10], 1):
            tn = t.get("task_number", "?")
            title = t.get("title", "Untitled")
            urgent = "🔴 " if t.get("is_urgent") else ""
            designer_name = await self._get_designer_name(t)

            # Show latest upload info
            uploads = t.get("designer_uploads", [])
            upload_info = f"📸 {len(uploads)} upload(s)" if uploads else "No uploads"

            lines.append(
                f"{i}️⃣ {urgent}*#{tn}* — {title}\n"
                f"   Designer: {designer_name}\n"
                f"   {upload_info}\n"
                f"   ✅ _approve {i}_ | 🔄 _reject {i} reason_"
            )
            session.task_refs[str(i)] = str(t["_id"])

        lines.append(
            "\n*Reply:*\n"
            "• _approve N_ — Approve task number N\n"
            "• _reject N reason_ — Request changes\n"
            "• _assign N_ — Assign task to a designer\n"
            "• Reply with just a number to see its design"
        )
        return "\n".join(lines)

    # ───── ASSIGN ─────

    async def _handle_assign_start(self, user: dict, extra: str, session: WhatsAppSession) -> str:
        role = user.get("role", "").lower()
        if role not in ("admin", "assigner", "approver"):
            return "⚠️ Only admins and assigners can assign tasks."

        parts = extra.split("|", 1) if "|" in extra else [extra, ""]
        task_ref = parts[0].strip()
        designer_name = parts[1].strip() if len(parts) > 1 else ""

        if not task_ref:
            return "⚠️ Please specify a task number. Example: *assign #5*"

        task = await self._resolve_task_ref(task_ref, session)
        if isinstance(task, str):
            return task  # error message

        # Load designers
        from app.repositories.user_repo import UserRepository
        designers = await UserRepository.list_designers()
        if not designers:
            return "⚠️ No designers found in the system."

        _clear_session(session.phone)
        session.flow = "assigning_task"
        session.data = {"task_id": str(task["_id"])}

        # Build numbered list of designers
        session.task_refs = {}  # Overload task_refs to store designer IDs for this step
        tn = task.get("task_number", "?")
        lines = [f"👤 Who do you want to assign Task *#{tn}* to?\n"]
        for i, d in enumerate(designers, 1):
            name = d.get("full_name", d.get("email", "Designer"))
            lines.append(f"{i}️⃣ {name}")
            session.task_refs[str(i)] = str(d["_id"])

        lines.append("\nReply with the number.")
        return "\n".join(lines)

    # ───── APPROVE ─────

    async def _handle_approve(self, user: dict, extra: str, session: WhatsAppSession) -> str:
        role = user.get("role", "").lower()
        task = await self._resolve_task_ref(extra, session)
        if isinstance(task, str):
            return task  # error message

        task_id = str(task["_id"])
        tn = task.get("task_number", "?")
        title = task.get("title", "Untitled")

        try:
            if role == "admin":
                await self.task_service.admin_approve_task(task_id, user)
                return f"✅ Task *#{tn}* — _{title}_ approved by Admin!\nMoved to approver queue for final approval."
            elif role in ("approver", "assigner"):
                await self.task_service.approver_approve_task(task_id, user)
                return f"✅ Task *#{tn}* — _{title}_ fully approved! 🎉"
            else:
                return "⚠️ Only admins and approvers can approve tasks."
        except Exception as e:
            return f"❌ Could not approve: {str(e)}"

    # ───── REJECT / REQUEST CHANGES ─────

    async def _handle_reject(self, user: dict, extra: str, session: WhatsAppSession) -> str:
        role = user.get("role", "").lower()

        # Parse "ref|comment" or just "comment"
        parts = extra.split("|", 1) if "|" in extra else [extra, ""]
        ref = parts[0].strip()
        comment = parts[1].strip() if len(parts) > 1 else ""

        # If no comment provided after ref, try to get it from the rest
        if ref and not comment:
            # Maybe the format is "reject 1 fix the colors"
            m = re.match(r"(\d+)\s+(.*)", ref, re.DOTALL)
            if m:
                ref = m.group(1)
                comment = m.group(2)

        task = await self._resolve_task_ref(ref, session)
        if isinstance(task, str):
            return task

        if not comment:
            return "⚠️ Please include a reason. Example: *reject 1 please fix the colors*"

        task_id = str(task["_id"])
        tn = task.get("task_number", "?")
        title = task.get("title", "Untitled")

        try:
            if role == "admin":
                await self.task_service.admin_request_changes(task_id, comment, user)
            elif role in ("approver", "assigner"):
                await self.task_service.approver_request_changes(task_id, comment, user)
            else:
                return "⚠️ Only admins and approvers can request changes."

            return f"🔄 Changes requested for *#{tn}* — _{title}_\nComment: _{comment}_"
        except Exception as e:
            return f"❌ Could not request changes: {str(e)}"

    # ───── STATUS ─────

    async def _handle_status(self, user: dict, extra: str, session: WhatsAppSession) -> str:
        task = await self._resolve_task_ref(extra, session)
        if isinstance(task, str):
            return task

        return await self._format_task_detail(task)

    # ───── DONE / COMPLETE ─────

    async def _handle_done(self, user: dict, extra: str, session: WhatsAppSession) -> str:
        role = user.get("role", "").lower()
        if role != "designer":
            return "⚠️ Only designers can mark tasks as complete."

        task = await self._resolve_task_ref(extra, session)
        if isinstance(task, str):
            return task

        task_id = str(task["_id"])
        tn = task.get("task_number", "?")
        title = task.get("title", "Untitled")

        try:
            await self.task_service.complete_task(task_id, user)
            return (
                f"✅ Task *#{tn}* — _{title}_ marked as complete!\n"
                "Admin has been notified for review. 🔔"
            )
        except Exception as e:
            return f"❌ Could not complete: {str(e)}"

    # ───── MEDIA UPLOAD ─────

    async def _handle_media(
        self,
        user: dict,
        media_urls: List[str],
        body: str,
        session: WhatsAppSession,
    ) -> str:
        role = user.get("role", "").lower()

        # Determine target task
        target_task = None

        # Check if body contains a task ref
        m = re.search(r"#?(\d+)", body) if body else None
        if m:
            ref = m.group(1)
            target_task = await self._resolve_task_ref(ref, session)
            if isinstance(target_task, str):
                target_task = None

        # If creating a task, store as reference images
        if session.flow == "smart_create_task":
            uploaded_urls = []
            for url in media_urls:
                try:
                    cloud_url = await _download_and_upload_to_cloudinary(url)
                    uploaded_urls.append(cloud_url)
                except Exception as e:
                    logger.error(f"Upload failed: {e}")

            if uploaded_urls:
                existing = session.data.get("reference_images", [])
                existing.extend(uploaded_urls)
                session.data["reference_images"] = existing
                return (
                    f"📸 {len(uploaded_urls)} image(s) added to the draft!\n"
                    "Send more images, add more details, or reply *create* to finish."
                )
            return "❌ Could not upload the image. Please try again."

        # If no task found, try to find designer's active tasks
        if not target_task and role == "designer":
            tasks = await self.task_service.my_tasks(user)
            working_tasks = [
                t for t in tasks
                if t.get("design_status") in ("Working", "ChangesRequired")
            ]

            if len(working_tasks) == 1:
                target_task = working_tasks[0]
            elif len(working_tasks) > 1:
                session.flow = "selecting_upload_task"
                session.task_refs = {}
                lines = ["📸 Which task should I upload this to?\n"]
                for i, t in enumerate(working_tasks, 1):
                    tn = t.get("task_number", "?")
                    title = t.get("title", "Untitled")
                    lines.append(f"{i}️⃣ *#{tn}* — {title}")
                    session.task_refs[str(i)] = str(t["_id"])

                # Store media URLs for later
                session.data["pending_media_urls"] = media_urls
                lines.append("\nReply with the number.")
                return "\n".join(lines)
            else:
                return "⚠️ You have no active tasks to upload to. Start a task first!"

        if not target_task:
            # For non-designers, could be a reference image for a specific task
            return (
                "📸 Image received! Specify the task number:\n"
                "Example: *upload #5* or send the image with caption *#5*"
            )

        # Upload each media to Cloudinary and attach to the task
        uploaded_count = 0
        task_id = str(target_task["_id"])
        for url in media_urls:
            try:
                cloud_url = await _download_and_upload_to_cloudinary(url)
                # Attach to task
                existing = target_task.get("designer_uploads", [])
                revision = len(existing) + 1 + uploaded_count
                new_upload = {
                    "url": cloud_url,
                    "uploaded_at": datetime.utcnow(),
                    "revision": revision,
                }
                await self.task_repo.collection.update_one(
                    {"_id": ObjectId(task_id)},
                    {"$push": {"designer_uploads": new_upload}},
                )
                uploaded_count += 1
            except Exception as e:
                logger.error(f"Media upload failed: {e}")

        tn = target_task.get("task_number", "?")
        title = target_task.get("title", "Untitled")
        if uploaded_count:
            return (
                f"✅ {uploaded_count} image(s) uploaded to *#{tn}* — _{title}_\n"
                "Send *done* when you've finished all uploads."
            )
        return "❌ Failed to upload. Please try again."

    # ───── MULTI-STEP TASK CREATION ─────

    async def _handle_create_start(self, user: dict, extra: str, session: WhatsAppSession) -> str:
        role = user.get("role", "").lower()
        if role not in ("admin", "assigner", "approver"):
            return "⚠️ Only admins, assigners, and approvers can create tasks."

        _clear_session(session.phone)
        session.flow = "smart_create_task"
        session.data = {
            "draft": {
                "title": None,
                "content_type": None,
                "size": None,
                "instructions": None,
                "deadline": None,
                "designer_name": None
            },
            "reference_images": []
        }

        # If the user provided details in the message, try AI parsing immediately
        if extra:
            return await self._process_smart_create_input(user, extra, session)

        return (
            "📝 *Let's create a new task!*\n\n"
            "Tell me the details you want to add:\n"
            "_(e.g. \"banner design size 1080 assign to raheel for tomorrow\")_\n\n"
            "📸 You can also send reference images now."
        )

    async def _process_smart_create_input(self, user: dict, text: str, session: WhatsAppSession) -> str:
        """Parse natural language task details via GPT-4o-mini and update draft."""
        current_draft = session.data.get("draft", {})
        
        try:
            parsed = await self.ai_service.parse_whatsapp_task(text, current_state=current_draft)
        except Exception as e:
            logger.error(f"AI parsing failed: {e}")
            return "❌ Sorry, I couldn't understand that. Please try rephrasing."

        # Update draft with new parsed values
        for k, v in parsed.items():
            if v is not None:
                current_draft[k] = v
        
        session.data["draft"] = current_draft
        
        # Display current state
        title = current_draft.get("title") or "Missing ⚠️"
        content_type = current_draft.get("content_type") or "General"
        size = current_draft.get("size") or "Not specified"
        instructions = current_draft.get("instructions") or "None"
        deadline_str = current_draft.get("deadline") or "Missing"
        designer_name = current_draft.get("designer_name") or "Unassigned"
        
        ref_images = session.data.get("reference_images", [])

        missing_fields = []
        if not current_draft.get("title"): missing_fields.append("Title")
        
        missing_text = f"\n\n❓ *Missing required info:* {', '.join(missing_fields)}" if missing_fields else ""

        return (
            "📋 *Draft Task Updated:*\n\n"
            f"📌 Title: _{title}_\n"
            f"📂 Type: _{content_type}_\n"
            f"📏 Size: _{size}_\n"
            f"📝 Instructions: _{instructions}_\n"
            f"📅 Deadline: _{deadline_str}_\n"
            f"👤 Designer: _{designer_name}_\n"
            f"📸 Reference images: {len(ref_images)}"
            f"{missing_text}\n\n"
            "Reply *create* to save this task, or reply with more details to fill in/change fields."
        )

    async def _finalize_smart_create(self, user: dict, session: WhatsAppSession) -> str:
        """Finalize and save the task from the session draft."""
        current_draft = session.data.get("draft", {})
        title = current_draft.get("title")
        if not title or title == "Missing ⚠️":
            return "⚠️ A *Title* is required to create a task. Please tell me what you want to create."

        content_type = current_draft.get("content_type") or "General"
        size = current_draft.get("size")
        instructions = current_draft.get("instructions")
        deadline_str = current_draft.get("deadline")
        designer_name = current_draft.get("designer_name")
        ref_images = session.data.get("reference_images", [])

        deadline = None
        if deadline_str and deadline_str != "Missing":
            try:
                deadline = datetime.strptime(deadline_str, "%Y-%m-%d")
            except Exception:
                pass
        
        task_create = TaskCreate(
            title=title,
            content_type=content_type,
            size=size,
            instructions=instructions,
            deadline=deadline,
            reference_images=ref_images,
        )

        try:
            # 1. Create the task
            created = await self.task_service.create_task(task_create, user)
            task_id = str(created["_id"])
            tn = created.get("task_number", "?")
            
            # 2. Try to automatically assign it if a designer was mentioned
            assign_msg = ""
            if designer_name and designer_name != "Unassigned":
                from app.repositories.user_repo import UserRepository
                designers = await UserRepository.list_designers()
                
                # Simple fuzzy matching
                matched_designer = None
                search_lower = designer_name.lower().strip()
                for d in designers:
                    name_lower = d.get("full_name", d.get("email", "")).lower()
                    if search_lower in name_lower or name_lower in search_lower:
                        matched_designer = d
                        break
                
                if matched_designer:
                    await self.task_service.assign_designer(task_id, str(matched_designer["_id"]), user)
                    assign_msg = f"\n👤 Assigned to: *{matched_designer.get('full_name', matched_designer.get('email', 'Designer'))}*"
                else:
                    assign_msg = f"\n⚠️ Tried to assign to '_{designer_name}_' but couldn't find a matching designer."

            _clear_session(session.phone)
            return (
                f"✅ Task *#{tn}* created successfully! 🎉\n"
                f"📌 _{title}_"
                + assign_msg
            )
        except Exception as e:
            _clear_session(session.phone)
            return f"❌ Could not create task: {str(e)}"

    async def _handle_session_flow(self, user: dict, body: str, session: WhatsAppSession) -> str:
        """Handle multi-step flows."""

        # ── Selecting a task for upload ──
        if session.flow == "selecting_upload_task":
            ref = body.strip()
            task_id = session.task_refs.get(ref)
            if not task_id:
                return "⚠️ Invalid selection. Please reply with a number from the list."

            task = await self.task_repo.get_by_id(task_id)
            if not task:
                return "❌ Task not found."

            # Process pending media
            media_urls = session.data.get("pending_media_urls", [])
            session.flow = None
            session.data = {}

            if media_urls:
                return await self._handle_media(user, media_urls, "", session)
            return "✅ Task selected, but no image was pending. Send your image now."

        # ── Assigning a task ──
        if session.flow == "assigning_task":
            num = body.strip()
            designer_id = session.task_refs.get(num)
            if not designer_id:
                return "⚠️ Invalid selection. Please reply with a number from the list."

            task_id = session.data.get("task_id")
            if not task_id:
                _clear_session(session.phone)
                return "⚠️ Session expired. Please start over."

            try:
                task = await self.task_service.assign_designer(task_id, designer_id, user)
                designer_name = await self._get_designer_name(task)
                tn = task.get("task_number", "?")
                title = task.get("title", "Untitled")
                _clear_session(session.phone)
                return f"✅ Task *#{tn}* — _{title}_ has been assigned to *{designer_name}*!"
            except Exception as e:
                _clear_session(session.phone)
                return f"❌ Could not assign task: {str(e)}"

        # ── Task creation iterative flow ──
        if session.flow == "smart_create_task":
            text_lower = body.strip().lower()
            if text_lower in ("create", "confirm", "yes", "ok"):
                return await self._finalize_smart_create(user, session)
                
            # Otherwise, re-parse and append info
            return await self._process_smart_create_input(user, body, session)

    # ───── NUMBER SELECTION (context-aware) ─────

    async def _handle_number_selection(self, user: dict, num: str, session: WhatsAppSession) -> str:
        """Handle when user just sends a number — check session refs."""
        task_id = session.task_refs.get(num)
        if not task_id:
            return "🤔 I didn't understand that. Send *help* to see what I can do!"

        task = await self.task_repo.get_by_id(task_id)
        if not task:
            return "❌ Task not found."

        return await self._format_task_detail(task)

    # ───── HELPERS ─────

    async def _resolve_task_ref(self, ref: str, session: WhatsAppSession):
        """Resolve a task from either a session ref number or a task_number."""
        if not ref:
            return "⚠️ Please specify a task number. Example: *approve #5*"

        # First try session refs (e.g., user listed tasks, now replying with "1")
        task_id_from_session = session.task_refs.get(ref)
        if task_id_from_session:
            task = await self.task_repo.get_by_id(task_id_from_session)
            if task:
                return task

        # Then try as task_number
        try:
            task_num = int(ref)
            task = await self.task_repo.get_by_task_number(task_num)
            if task:
                return task
        except ValueError:
            pass

        return f"❌ Task #{ref} not found."

    async def _get_designer_name(self, task: dict) -> str:
        designer_id = task.get("designer_id")
        if not designer_id:
            return "Unassigned"
        user = await self.db["users"].find_one({"_id": ObjectId(designer_id) if not isinstance(designer_id, ObjectId) else designer_id})
        return user.get("full_name", "Unknown") if user else "Unknown"

    async def _format_task_detail(self, task: dict) -> str:
        tn = task.get("task_number", "?")
        title = task.get("title", "Untitled")
        content_type = task.get("content_type", "?")
        ds = task.get("design_status", "?")
        ap = task.get("approval_status", "?")
        instructions = task.get("instructions", "None")
        deadline = task.get("deadline")
        urgent = "🔴 URGENT" if task.get("is_urgent") else ""
        designer_name = await self._get_designer_name(task)
        uploads = task.get("designer_uploads", [])
        ref_images = task.get("reference_images", [])

        msg = (
            f"📊 *Task #{tn}* — _{title}_ {urgent}\n\n"
            f"📂 Type: {content_type}\n"
            f"🎨 Designer: {designer_name}\n"
            f"🔧 Design Status: {ds}\n"
            f"✅ Approval: {ap}\n"
        )

        if instructions:
            msg += f"📝 Instructions: _{instructions}_\n"
        if deadline:
            msg += f"📅 Deadline: {deadline.strftime('%Y-%m-%d') if hasattr(deadline, 'strftime') else deadline}\n"
        if ref_images:
            msg += f"📸 Reference images: {len(ref_images)}\n"
        if uploads:
            msg += f"🖼️ Designer uploads: {len(uploads)} revision(s)\n"
            latest = uploads[-1]
            msg += f"   Latest: {latest.get('url', 'N/A')}\n"

        if task.get("approval_comment"):
            msg += f"\n💬 Last comment: _{task['approval_comment']}_\n"

        return msg

    # ───── SEND OUTBOUND ─────

    async def send_message(self, to_phone: str, body: str, media_url: str = None) -> bool:
        """Send a WhatsApp message via Twilio."""
        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            logger.warning("Twilio not configured, skipping WhatsApp message")
            return False

        try:
            from twilio.rest import Client

            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            kwargs = {
                "from_": f"whatsapp:{settings.TWILIO_WHATSAPP_NUMBER}",
                "to": f"whatsapp:{to_phone}",
                "body": body,
            }
            if media_url:
                kwargs["media_url"] = [media_url]

            client.messages.create(**kwargs)
            return True
        except Exception as e:
            logger.error(f"Failed to send WhatsApp message: {e}")
            return False
