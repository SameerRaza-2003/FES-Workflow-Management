import httpx
from datetime import datetime, timedelta
from typing import Optional, Tuple
from urllib.parse import urlencode

from app.core.config import settings
from app.models.social import SocialPlatform


class SocialAuthService:
    """Handles OAuth flows for social media platforms"""

    def __init__(self):
        # Meta (Facebook / Instagram)
        self.meta_app_id = settings.META_APP_ID
        self.meta_app_secret = settings.META_APP_SECRET
        self.meta_redirect_uri = settings.META_REDIRECT_URI

        # LinkedIn
        self.linkedin_client_id = settings.LINKEDIN_CLIENT_ID
        self.linkedin_client_secret = settings.LINKEDIN_CLIENT_SECRET
        self.linkedin_redirect_uri = settings.LINKEDIN_REDIRECT_URI

    # ===================== META (Facebook / Instagram) =====================

    def get_meta_auth_url(self, state: str) -> str:
        """Generate Facebook/Instagram OAuth URL"""
        params = {
            "client_id": self.meta_app_id,
            "redirect_uri": self.meta_redirect_uri,
            "response_type": "code",
            "state": state,
            "scope": ",".join([
                "pages_show_list",
                "pages_read_engagement",
                "pages_manage_posts",
                "instagram_basic",
                "instagram_content_publish",
            ]),
        }

        return f"https://www.facebook.com/v19.0/dialog/oauth?{urlencode(params)}"

    async def exchange_meta_code(self, code: str) -> Tuple[Optional[dict], Optional[str]]:
        """Exchange Facebook auth code for access tokens"""
        async with httpx.AsyncClient() as client:
            # Step 1: Short-lived token
            response = await client.get(
                "https://graph.facebook.com/v19.0/oauth/access_token",
                params={
                    "client_id": self.meta_app_id,
                    "client_secret": self.meta_app_secret,
                    "redirect_uri": self.meta_redirect_uri,
                    "code": code,
                }
            )

            if response.status_code != 200:
                return None, f"Failed to exchange code: {response.text}"

            data = response.json()
            short_lived_token = data.get("access_token")

            # Step 2: Exchange for long-lived token
            ll_response = await client.get(
                "https://graph.facebook.com/v19.0/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.meta_app_id,
                    "client_secret": self.meta_app_secret,
                    "fb_exchange_token": short_lived_token,
                }
            )

            if ll_response.status_code != 200:
                return None, f"Failed to get long-lived token: {ll_response.text}"

            ll_data = ll_response.json()
            expires_in = ll_data.get("expires_in", 5184000)  # ~60 days

            return {
                "access_token": ll_data.get("access_token"),
                "expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
            }, None

    async def get_meta_accounts(self, access_token: str) -> Tuple[Optional[dict], Optional[str]]:
        """Get connected Facebook Pages and Instagram Business accounts"""
        async with httpx.AsyncClient() as client:
            # User info
            me_response = await client.get(
                "https://graph.facebook.com/v19.0/me",
                params={"access_token": access_token, "fields": "id,name"}
            )

            if me_response.status_code != 200:
                return None, "Failed to get user info"

            me_data = me_response.json()

            # Pages
            pages_response = await client.get(
                "https://graph.facebook.com/v19.0/me/accounts",
                params={
                    "access_token": access_token,
                    "fields": "id,name,access_token,instagram_business_account"
                }
            )

            pages = []
            instagram_accounts = []

            if pages_response.status_code == 200:
                for page in pages_response.json().get("data", []):
                    pages.append({
                        "id": page["id"],
                        "name": page["name"],
                        "access_token": page.get("access_token"),
                    })

                    # Instagram Business account linked to page
                    if page.get("instagram_business_account"):
                        ig_id = page["instagram_business_account"]["id"]
                        ig_response = await client.get(
                            f"https://graph.facebook.com/v19.0/{ig_id}",
                            params={
                                "access_token": access_token,
                                "fields": "id,username"
                            }
                        )

                        if ig_response.status_code == 200:
                            ig_data = ig_response.json()
                            instagram_accounts.append({
                                "id": ig_data["id"],
                                "username": ig_data.get("username", ""),
                                "page_id": page["id"],
                                "page_access_token": page.get("access_token"),
                            })

            return {
                "user_id": me_data["id"],
                "user_name": me_data["name"],
                "pages": pages,
                "instagram_accounts": instagram_accounts,
            }, None

    # ===================== LINKEDIN =====================

    def get_linkedin_auth_url(self, state: str) -> str:
        """Generate LinkedIn OAuth URL"""
        params = {
            "response_type": "code",
            "client_id": self.linkedin_client_id,
            "redirect_uri": self.linkedin_redirect_uri,
            "scope": "openid profile w_member_social",
            "state": state,
        }

        return f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"

    async def exchange_linkedin_code(self, code: str) -> Tuple[Optional[dict], Optional[str]]:
        """Exchange LinkedIn auth code for access token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "client_id": self.linkedin_client_id,
                    "client_secret": self.linkedin_client_secret,
                    "redirect_uri": self.linkedin_redirect_uri,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )

            if response.status_code != 200:
                return None, f"Failed to exchange code: {response.text}"

            data = response.json()
            expires_in = data.get("expires_in", 5184000)

            profile_response = await client.get(
                "https://api.linkedin.com/v2/userinfo",
                headers={"Authorization": f"Bearer {data['access_token']}"}
            )

            profile = profile_response.json() if profile_response.status_code == 200 else {}

            return {
                "access_token": data["access_token"],
                "expires_at": datetime.utcnow() + timedelta(seconds=expires_in),
                "user_id": profile.get("sub", ""),
                "user_name": profile.get("name", ""),
            }, None
