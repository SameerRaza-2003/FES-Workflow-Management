import json
from datetime import datetime
from typing import List
from openai import AsyncOpenAI

from app.core.config import settings
from app.models.ai import CommentItem


class AIService:
    """Wraps OpenAI GPT-4o-mini for workflow-related AI features."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o-mini"

    # ─── Caption Generator ──────────────────────────────────────

    async def generate_caption(
        self,
        brand: str,
        topic: str,
        tone: str = "professional",
        platform: str = "general",
    ) -> str:
        system = (
            "You are an expert social media copywriter. "
            "Generate a single, engaging social media caption. "
            "Include relevant emojis and 3-5 hashtags at the end. "
            "Keep it concise (under 280 characters for Twitter, under 2200 for others). "
            "Do NOT add any prefix or label — just the caption text."
        )
        user = (
            f"Brand: {brand}\n"
            f"Topic: {topic}\n"
            f"Tone: {tone}\n"
            f"Platform: {platform}\n\n"
            f"Write the caption:"
        )
        return await self._chat(system, user)

    # ─── Task Description Generator ─────────────────────────────

    async def generate_task_description(
        self,
        title: str,
        content_type: str = "",
        brand: str = "",
    ) -> dict:
        system = (
            "You are a design project manager's assistant. "
            "Given a brief task title, generate a clear description and step-by-step instructions "
            "for a graphic designer. Be specific and actionable.\n\n"
            "Respond in this exact format (no markdown, just plain text):\n"
            "DESCRIPTION:\n<one paragraph describing the deliverable>\n\n"
            "INSTRUCTIONS:\n<numbered step-by-step list>"
        )
        user = f"Task Title: {title}"
        if content_type:
            user += f"\nContent Type: {content_type}"
        if brand:
            user += f"\nBrand: {brand}"

        raw = await self._chat(system, user)
        return self._parse_description_response(raw)

    # ─── WhatsApp Task Parser (GPT-4o-mini) ─────────────────────

    async def parse_whatsapp_task(self, command: str, current_state: dict = None) -> dict:
        """
        Parses a natural language WhatsApp command into structured task data,
        optionally updating an existing draft state.
        """
        today_date = datetime.now().strftime("%Y-%m-%d")
        
        state_prompt = ""
        if current_state:
            state_prompt = (
                f"Here is the current drafted task state:\n{json.dumps(current_state, indent=2)}\n"
                "Update these details based on the new command, keeping existing details that aren't overridden."
            )
        else:
            state_prompt = "Extract task details from the user's natural language command."

        system = (
            "You are an intelligent assistant for a design workflow system. "
            f"{state_prompt}\n"
            f"Today's date is {today_date}. "
            "Return ONLY a valid JSON object matching the requested schema. Do not wrap it in markdown code blocks.\n\n"
            "Schema:\n"
            "{\n"
            '  "title": "string (the main deliverable)",\n'
            '  "content_type": "string (e.g., Banner, Social Media Post, General)",\n'
            '  "size": "string (e.g., 1080x1080, A4, or null)",\n'
            '  "instructions": "string (any extra details, or null)",\n'
            '  "deadline": "YYYY-MM-DD or null if not specified. Calculate based on today\'s date if words like \'tomorrow\' or \'next friday\' are used. If just a day of month is given, assume current or next month.",\n'
            '  "designer_name": "string (name of the person to assign to, or null)"\n'
            "}"
        )
        
        user = f"Command: {command}\n\nExtract the JSON:"
        
        raw_json = await self._chat(system, user)
        
        # Clean up in case there's markdown formatting
        if raw_json.startswith("```json"):
            raw_json = raw_json[7:]
        if raw_json.startswith("```"):
            raw_json = raw_json[3:]
        if raw_json.endswith("```"):
            raw_json = raw_json[:-3]
            
        try:
            return json.loads(raw_json.strip())
        except json.JSONDecodeError:
            # Fallback if parsing fails
            return {
                "title": command.strip()[:100] or "Untitled",
                "content_type": "General",
                "instructions": command,
                "deadline": None,
                "designer_name": None
            }

    # ─── Comment Summarizer ──────────────────────────────────────

    async def summarize_comments(
        self,
        comments: List[CommentItem],
        task_title: str = "",
    ) -> str:
        system = (
            "You are a project manager assistant. Summarize the comment thread concisely. "
            "Highlight key decisions, action items, and any unresolved issues. "
            "Use bullet points. Keep it under 150 words."
        )

        thread = "\n".join(
            f"[{c.role}] {c.author}: {c.content}" for c in comments
        )
        user = f"Task: {task_title}\n\nComments:\n{thread}\n\nSummarize:"

        return await self._chat(system, user)

    # ─── Analytics Insights ──────────────────────────────────────

    async def generate_analytics_insights(
        self,
        total_tasks: int,
        completed_tasks: int,
        completion_rate: float,
        overdue_count: int,
        at_risk_count: int,
        top_designer: str | None = None,
        top_designer_completed: int = 0,
        avg_completion_days: float | None = None,
        designers_count: int = 0,
    ) -> str:
        system = (
            "You are a data analyst assistant for a design workflow team. "
            "Given the metrics below, write 3-4 concise, actionable insights. "
            "Format each insight as a short paragraph starting with an emoji "
            "(e.g. ✅, ⚠️, 📊, 🚀, 💡, 🔥). "
            "Do NOT use any markdown formatting — no asterisks, no bold, no headers. "
            "Use plain text only. Separate each insight with a blank line. "
            "Highlight wins, risks, and recommendations. "
            "Keep it under 120 words. Be specific with numbers."
        )

        user = (
            f"Total tasks: {total_tasks}\n"
            f"Completed: {completed_tasks}\n"
            f"Completion rate: {completion_rate:.1f}%\n"
            f"Overdue tasks: {overdue_count}\n"
            f"At-risk tasks: {at_risk_count}\n"
            f"Number of designers: {designers_count}\n"
        )
        if top_designer:
            user += f"Top designer: {top_designer} ({top_designer_completed} completed)\n"
        if avg_completion_days is not None:
            user += f"Avg completion time: {avg_completion_days:.1f} days\n"

        user += "\nProvide insights:"

        return await self._chat(system, user)

    # ─── Internal ────────────────────────────────────────────────

    async def _chat(self, system: str, user: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.7,
            max_tokens=500,
        )
        return response.choices[0].message.content.strip()

    @staticmethod
    def _parse_description_response(raw: str) -> dict:
        desc = ""
        instr = ""

        if "DESCRIPTION:" in raw and "INSTRUCTIONS:" in raw:
            parts = raw.split("INSTRUCTIONS:")
            desc = parts[0].replace("DESCRIPTION:", "").strip()
            instr = parts[1].strip()
        else:
            # Fallback: use whole response as description
            desc = raw
            instr = ""

        return {"description": desc, "instructions": instr}
