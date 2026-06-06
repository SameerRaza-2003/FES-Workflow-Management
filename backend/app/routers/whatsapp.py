"""
WhatsApp Router — Twilio webhook for incoming messages + internal send API.

POST /whatsapp/webhook  — Public (Twilio posts here)
POST /whatsapp/send     — JWT-protected (internal use)
"""

import logging
from fastapi import APIRouter, Depends, Form, Request, HTTPException
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.db.mongo import get_db
from app.models.whatsapp import SendMessageRequest
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


# ─────────────────────────────────────────────────────────
# DEPENDENCY
# ─────────────────────────────────────────────────────────

def get_whatsapp_service(db: AsyncIOMotorDatabase = Depends(get_db)) -> WhatsAppService:
    return WhatsAppService(db)


# ─────────────────────────────────────────────────────────
# TWILIO SIGNATURE VALIDATION
# ─────────────────────────────────────────────────────────

def _validate_twilio_signature(request: Request, form_data: dict) -> bool:
    """
    Validate that the request is actually from Twilio.
    Skipped in dev mode for easy local testing.
    """
    if settings.APP_ENV == "dev":
        return True

    if not settings.TWILIO_AUTH_TOKEN:
        return False

    try:
        from twilio.request_validator import RequestValidator
        validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
        signature = request.headers.get("X-Twilio-Signature", "")
        url = str(request.url)
        return validator.validate(url, form_data, signature)
    except Exception as e:
        logger.error(f"Twilio signature validation error: {e}")
        return False


# ─────────────────────────────────────────────────────────
# WEBHOOK (Public — Twilio POSTs here)
# ─────────────────────────────────────────────────────────

@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """
    Twilio sends incoming WhatsApp messages here as form data.
    We process the message and return a TwiML response.
    """
    # Parse form data
    form = await request.form()
    form_dict = dict(form)

    # Validate Twilio signature
    if not _validate_twilio_signature(request, form_dict):
        raise HTTPException(status_code=403, detail="Invalid Twilio signature")

    # Extract fields
    from_number = form_dict.get("From", "")
    body = form_dict.get("Body", "").strip()
    num_media = int(form_dict.get("NumMedia", "0"))

    # Collect media URLs
    media_urls = []
    for i in range(num_media):
        url = form_dict.get(f"MediaUrl{i}")
        if url:
            media_urls.append(url)

    # Detect group chat
    # In WhatsApp groups, "From" is the sender, "To" is the group
    is_group = "Group" in form_dict.get("ProfileName", "")

    logger.info(
        f"WhatsApp incoming — from={from_number}, body={body[:50]}, "
        f"media={num_media}, group={is_group}"
    )

    # Process the message
    try:
        reply = await service.handle_incoming(
            from_number=from_number,
            body=body,
            media_urls=media_urls,
            num_media=num_media,
            is_group=is_group,
        )
    except Exception as e:
        logger.error(f"WhatsApp handler error: {e}", exc_info=True)
        reply = "⚠️ Something went wrong. Please try again."

    # Return TwiML response
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"<Message>{_escape_xml(reply)}</Message>"
        "</Response>"
    )

    return Response(content=twiml, media_type="application/xml")


# ─────────────────────────────────────────────────────────
# SEND API (JWT-protected — internal use)
# ─────────────────────────────────────────────────────────

@router.post("/send")
async def send_whatsapp_message(
    payload: SendMessageRequest,
    current_user: dict = Depends(get_current_user),
    service: WhatsAppService = Depends(get_whatsapp_service),
):
    """
    Send a WhatsApp message to a phone number.
    Only authenticated users can use this.
    """
    success = await service.send_message(
        to_phone=payload.to,
        body=payload.body,
        media_url=payload.media_url,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send WhatsApp message")

    return {"status": "sent", "to": payload.to}


# ─────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────

def _escape_xml(text: str) -> str:
    """Escape special XML characters for TwiML response."""
    return (
        text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
