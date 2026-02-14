from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.services.ai_service import AIService
from app.models.ai import (
    CaptionRequest,
    CaptionResponse,
    TaskDescriptionRequest,
    TaskDescriptionResponse,
    SummarizeRequest,
    SummarizeResponse,
    AnalyticsInsightsRequest,
    AnalyticsInsightsResponse,
)


router = APIRouter(prefix="/ai", tags=["AI"])


def get_ai_service():
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI features are not configured. Set OPENAI_API_KEY in .env",
        )
    return AIService()


# ─── Caption Generator ──────────────────────────────────────

@router.post("/generate-caption", response_model=CaptionResponse)
async def generate_caption(
    req: CaptionRequest,
    current_user: dict = Depends(get_current_user),
    ai: AIService = Depends(get_ai_service),
):
    """Generate a social media caption using AI."""
    try:
        caption = await ai.generate_caption(
            brand=req.brand,
            topic=req.topic,
            tone=req.tone,
            platform=req.platform,
        )
        return CaptionResponse(caption=caption)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ─── Task Description Generator ─────────────────────────────

@router.post("/generate-task-description", response_model=TaskDescriptionResponse)
async def generate_task_description(
    req: TaskDescriptionRequest,
    current_user: dict = Depends(get_current_user),
    ai: AIService = Depends(get_ai_service),
):
    """Generate task description and instructions from a title."""
    try:
        result = await ai.generate_task_description(
            title=req.title,
            content_type=req.content_type,
            brand=req.brand,
        )
        return TaskDescriptionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ─── Comment Summarizer ──────────────────────────────────────

@router.post("/summarize-comments", response_model=SummarizeResponse)
async def summarize_comments(
    req: SummarizeRequest,
    current_user: dict = Depends(get_current_user),
    ai: AIService = Depends(get_ai_service),
):
    """Summarize a task's comment thread."""
    if len(req.comments) < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 comments to summarize",
        )
    try:
        summary = await ai.summarize_comments(
            comments=req.comments,
            task_title=req.task_title,
        )
        return SummarizeResponse(summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


# ─── Analytics Insights ──────────────────────────────────────

@router.post("/analytics-insights", response_model=AnalyticsInsightsResponse)
async def analytics_insights(
    req: AnalyticsInsightsRequest,
    current_user: dict = Depends(get_current_user),
    ai: AIService = Depends(get_ai_service),
):
    """Generate natural language insights from analytics data."""
    try:
        insights = await ai.generate_analytics_insights(
            total_tasks=req.total_tasks,
            completed_tasks=req.completed_tasks,
            completion_rate=req.completion_rate,
            overdue_count=req.overdue_count,
            at_risk_count=req.at_risk_count,
            top_designer=req.top_designer,
            top_designer_completed=req.top_designer_completed,
            avg_completion_days=req.avg_completion_days,
            designers_count=req.designers_count,
        )
        return AnalyticsInsightsResponse(insights=insights)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")
