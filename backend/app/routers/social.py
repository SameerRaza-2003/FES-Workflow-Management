import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.social import (
    SocialPlatform,
    SocialConnectionResponse,
    SocialPostCreate,
    SocialPostResponse,
    SocialPostResult,
)
from app.repositories.social_repo import SocialConnectionRepository
from app.services.social_auth_service import SocialAuthService
from app.services.social_posting_service import SocialPostingService


router = APIRouter(prefix="/social", tags=["Social Media"])


def get_repo(db: AsyncIOMotorDatabase = Depends(get_db)) -> SocialConnectionRepository:
    return SocialConnectionRepository(db)


def get_auth_service() -> SocialAuthService:
    return SocialAuthService()


def get_posting_service() -> SocialPostingService:
    return SocialPostingService()


# ⚠️ For production, replace with Redis or DB
_oauth_states: dict[str, str] = {}


# ===================== CONNECTIONS =====================

@router.get("/connections", response_model=list[SocialConnectionResponse])
async def list_connections(
    current_user: dict = Depends(get_current_user),
    repo: SocialConnectionRepository = Depends(get_repo),
):
    user_id = str(current_user["_id"])
    connections = await repo.get_user_connections(user_id)

    result = []
    for conn in connections:
        is_expired = False
        if conn.get("token_expires_at"):
            is_expired = conn["token_expires_at"] < datetime.utcnow()

        result.append(SocialConnectionResponse(
            id=str(conn["_id"]),
            platform=conn["platform"],
            platform_user_id=conn["platform_user_id"],
            platform_username=conn["platform_username"],
            page_id=conn.get("page_id"),
            page_name=conn.get("page_name"),
            connected_at=conn["connected_at"],
            is_expired=is_expired,
        ))

    return result


# ===================== OAUTH START =====================

@router.get("/auth/{platform}")
async def start_oauth(
    platform: SocialPlatform,
    current_user: dict = Depends(get_current_user),
    auth_service: SocialAuthService = Depends(get_auth_service),
):
    user_id = str(current_user["_id"])
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = user_id

    if platform in (SocialPlatform.FACEBOOK, SocialPlatform.INSTAGRAM):
        auth_url = auth_service.get_meta_auth_url(state)
    elif platform == SocialPlatform.LINKEDIN:
        auth_url = auth_service.get_linkedin_auth_url(state)
    else:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    return {"auth_url": auth_url, "state": state}


# ===================== META CALLBACK =====================

@router.get("/callback/meta")
async def meta_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    auth_service: SocialAuthService = Depends(get_auth_service),
):
    user_id = _oauth_states.pop(state, None)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    repo = SocialConnectionRepository(db)

    token_data, error = await auth_service.exchange_meta_code(code)
    if error:
        raise HTTPException(status_code=400, detail=error)

    accounts_data, error = await auth_service.get_meta_accounts(token_data["access_token"])
    if error:
        raise HTTPException(status_code=400, detail=error)

    created_connections: list[str] = []

    # Facebook Pages
    for page in accounts_data.get("pages", []):
        existing = await repo.get_by_platform(user_id, SocialPlatform.FACEBOOK)
        if existing:
            await repo.delete(str(existing["_id"]))

        await repo.create(user_id, {
            "platform": SocialPlatform.FACEBOOK,
            "platform_user_id": page["id"],
            "platform_username": page["name"],
            "page_id": page["id"],
            "page_name": page["name"],
            "access_token": page.get("access_token", token_data["access_token"]),
            "token_expires_at": token_data["expires_at"],
        })

        created_connections.append(f"Facebook: {page['name']}")

    # Instagram Business Accounts
    for ig in accounts_data.get("instagram_accounts", []):
        existing = await repo.get_by_platform(user_id, SocialPlatform.INSTAGRAM)
        if existing:
            await repo.delete(str(existing["_id"]))

        await repo.create(user_id, {
            "platform": SocialPlatform.INSTAGRAM,
            "platform_user_id": ig["id"],
            "platform_username": ig["username"],
            "page_id": ig.get("page_id"),
            "access_token": ig.get("page_access_token", token_data["access_token"]),
            "token_expires_at": token_data["expires_at"],
        })

        created_connections.append(f"Instagram: @{ig['username']}")

    connected_param = "%2C".join(created_connections) if created_connections else "none"

    return RedirectResponse(
        url=f"{settings.FRONTEND_BASE_URL}/dashboard/posting?connected={connected_param}",
        status_code=302,
    )


# ===================== LINKEDIN CALLBACK =====================

@router.get("/callback/linkedin")
async def linkedin_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    auth_service: SocialAuthService = Depends(get_auth_service),
):
    user_id = _oauth_states.pop(state, None)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired state")

    repo = SocialConnectionRepository(db)

    token_data, error = await auth_service.exchange_linkedin_code(code)
    if error:
        raise HTTPException(status_code=400, detail=error)

    existing = await repo.get_by_platform(user_id, SocialPlatform.LINKEDIN)
    if existing:
        await repo.delete(str(existing["_id"]))

    await repo.create(user_id, {
        "platform": SocialPlatform.LINKEDIN,
        "platform_user_id": token_data["user_id"],
        "platform_username": token_data["user_name"],
        "access_token": token_data["access_token"],
        "token_expires_at": token_data["expires_at"],
    })

    return RedirectResponse(
        url=f"{settings.FRONTEND_BASE_URL}/dashboard/posting"
            f"?connected=LinkedIn:%20{token_data['user_name']}",
        status_code=302,
    )


# ===================== DISCONNECT =====================

@router.delete("/connections/{connection_id}")
async def disconnect_account(
    connection_id: str,
    current_user: dict = Depends(get_current_user),
    repo: SocialConnectionRepository = Depends(get_repo),
):
    user_id = str(current_user["_id"])
    connection = await repo.get_by_id(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    if str(connection["user_id"]) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    deleted = await repo.delete(connection_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to disconnect")

    return {"message": "Disconnected successfully"}


# ===================== POST CONTENT =====================

@router.post("/post", response_model=SocialPostResponse)
async def create_post(
    post_data: SocialPostCreate,
    current_user: dict = Depends(get_current_user),
    repo: SocialConnectionRepository = Depends(get_repo),
    posting_service: SocialPostingService = Depends(get_posting_service),
):
    user_id = str(current_user["_id"])

    if not post_data.platforms:
        raise HTTPException(status_code=400, detail="No platforms selected")

    results: list[SocialPostResult] = []

    for platform in post_data.platforms:
        connection = await repo.get_by_platform(user_id, platform)

        if not connection:
            results.append(SocialPostResult(
                platform=platform,
                success=False,
                error_message=f"{platform.value} not connected"
            ))
            continue

        if connection.get("token_expires_at") and connection["token_expires_at"] < datetime.utcnow():
            results.append(SocialPostResult(
                platform=platform,
                success=False,
                error_message=f"{platform.value} token expired - please reconnect"
            ))
            continue

        if platform == SocialPlatform.INSTAGRAM:
            result = await posting_service.post_to_instagram(
                instagram_account_id=connection["platform_user_id"],
                page_access_token=connection["access_token"],
                image_url=post_data.image_url,
                caption=post_data.caption,
            )
        elif platform == SocialPlatform.FACEBOOK:
            result = await posting_service.post_to_facebook(
                page_id=connection["page_id"] or connection["platform_user_id"],
                page_access_token=connection["access_token"],
                image_url=post_data.image_url,
                caption=post_data.caption,
            )
        elif platform == SocialPlatform.LINKEDIN:
            result = await posting_service.post_to_linkedin(
                user_urn=connection["platform_user_id"],
                access_token=connection["access_token"],
                image_url=post_data.image_url,
                caption=post_data.caption,
            )
        else:
            result = SocialPostResult(
                platform=platform,
                success=False,
                error_message="Unsupported platform"
            )

        results.append(result)

    successful = sum(1 for r in results if r.success)
    failed = len(results) - successful

    return SocialPostResponse(
        results=results,
        successful_count=successful,
        failed_count=failed,
    )
