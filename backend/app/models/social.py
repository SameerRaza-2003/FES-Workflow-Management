from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class SocialPlatform(str, Enum):
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"


class SocialConnectionBase(BaseModel):
    platform: SocialPlatform
    platform_user_id: str
    platform_username: str
    page_id: Optional[str] = None  # For Facebook Pages
    page_name: Optional[str] = None


class SocialConnectionCreate(SocialConnectionBase):
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None


class SocialConnectionInDB(SocialConnectionBase):
    id: str = Field(alias="_id")
    user_id: str  # FES user who connected
    access_token: str  # Should be encrypted in production
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    connected_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True


class SocialConnectionResponse(SocialConnectionBase):
    id: str
    connected_at: datetime
    is_expired: bool = False


class SocialPostCreate(BaseModel):
    """Request body for creating a social media post"""
    image_url: str  # URL of the image to post
    caption: str
    platforms: list[SocialPlatform]  # Platforms to post to


class SocialPostResult(BaseModel):
    """Result of posting to a single platform"""
    platform: SocialPlatform
    success: bool
    post_id: Optional[str] = None
    error_message: Optional[str] = None


class SocialPostResponse(BaseModel):
    """Response after posting to multiple platforms"""
    results: list[SocialPostResult]
    successful_count: int
    failed_count: int
