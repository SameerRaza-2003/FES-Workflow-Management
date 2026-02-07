import httpx
from typing import Optional, Tuple
from datetime import datetime

from app.models.social import SocialPlatform, SocialPostResult


class SocialPostingService:
    """Handles posting content to social media platforms"""

    async def post_to_instagram(
        self,
        instagram_account_id: str,
        page_access_token: str,
        image_url: str,
        caption: str
    ) -> SocialPostResult:
        """Post an image to Instagram Business account"""
        async with httpx.AsyncClient() as client:
            try:
                # Step 1: Create media container
                container_response = await client.post(
                    f"https://graph.facebook.com/v19.0/{instagram_account_id}/media",
                    params={
                        "image_url": image_url,
                        "caption": caption,
                        "access_token": page_access_token,
                    }
                )

                if container_response.status_code != 200:
                    return SocialPostResult(
                        platform=SocialPlatform.INSTAGRAM,
                        success=False,
                        error_message=f"Failed to create media container: {container_response.text}"
                    )

                container_data = container_response.json()
                creation_id = container_data.get("id")

                # Step 2: Publish the container (wait a moment for processing)
                import asyncio
                await asyncio.sleep(2)  # Give Instagram time to process

                publish_response = await client.post(
                    f"https://graph.facebook.com/v19.0/{instagram_account_id}/media_publish",
                    params={
                        "creation_id": creation_id,
                        "access_token": page_access_token,
                    }
                )

                if publish_response.status_code != 200:
                    return SocialPostResult(
                        platform=SocialPlatform.INSTAGRAM,
                        success=False,
                        error_message=f"Failed to publish: {publish_response.text}"
                    )

                publish_data = publish_response.json()
                return SocialPostResult(
                    platform=SocialPlatform.INSTAGRAM,
                    success=True,
                    post_id=publish_data.get("id")
                )

            except Exception as e:
                return SocialPostResult(
                    platform=SocialPlatform.INSTAGRAM,
                    success=False,
                    error_message=str(e)
                )

    async def post_to_facebook(
        self,
        page_id: str,
        page_access_token: str,
        image_url: str,
        caption: str
    ) -> SocialPostResult:
        """Post an image to a Facebook Page"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"https://graph.facebook.com/v19.0/{page_id}/photos",
                    params={
                        "url": image_url,
                        "caption": caption,
                        "access_token": page_access_token,
                    }
                )

                if response.status_code != 200:
                    return SocialPostResult(
                        platform=SocialPlatform.FACEBOOK,
                        success=False,
                        error_message=f"Failed to post: {response.text}"
                    )

                data = response.json()
                return SocialPostResult(
                    platform=SocialPlatform.FACEBOOK,
                    success=True,
                    post_id=data.get("post_id") or data.get("id")
                )

            except Exception as e:
                return SocialPostResult(
                    platform=SocialPlatform.FACEBOOK,
                    success=False,
                    error_message=str(e)
                )

    async def post_to_linkedin(
        self,
        user_urn: str,
        access_token: str,
        image_url: str,
        caption: str
    ) -> SocialPostResult:
        """Post an image to LinkedIn"""
        async with httpx.AsyncClient() as client:
            try:
                # For LinkedIn, we need to register the image first, then create post
                # Simplified version using image URL directly (if allowed)
                
                # Step 1: Initialize image upload
                register_response = await client.post(
                    "https://api.linkedin.com/v2/assets?action=registerUpload",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                    json={
                        "registerUploadRequest": {
                            "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                            "owner": f"urn:li:person:{user_urn}",
                            "serviceRelationships": [{
                                "relationshipType": "OWNER",
                                "identifier": "urn:li:userGeneratedContent"
                            }]
                        }
                    }
                )

                if register_response.status_code not in [200, 201]:
                    # Fallback: post without image
                    return await self._post_linkedin_text_only(user_urn, access_token, caption, image_url)

                register_data = register_response.json()
                upload_url = register_data.get("value", {}).get("uploadMechanism", {}).get(
                    "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest", {}
                ).get("uploadUrl")
                asset_urn = register_data.get("value", {}).get("asset")

                if upload_url:
                    # Download image and upload to LinkedIn
                    img_response = await client.get(image_url)
                    if img_response.status_code == 200:
                        await client.put(
                            upload_url,
                            content=img_response.content,
                            headers={"Authorization": f"Bearer {access_token}"}
                        )

                # Step 2: Create the post
                post_response = await client.post(
                    "https://api.linkedin.com/v2/ugcPosts",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                    json={
                        "author": f"urn:li:person:{user_urn}",
                        "lifecycleState": "PUBLISHED",
                        "specificContent": {
                            "com.linkedin.ugc.ShareContent": {
                                "shareCommentary": {"text": caption},
                                "shareMediaCategory": "IMAGE" if asset_urn else "NONE",
                                "media": [{
                                    "status": "READY",
                                    "media": asset_urn,
                                }] if asset_urn else []
                            }
                        },
                        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
                    }
                )

                if post_response.status_code not in [200, 201]:
                    return SocialPostResult(
                        platform=SocialPlatform.LINKEDIN,
                        success=False,
                        error_message=f"Failed to post: {post_response.text}"
                    )

                data = post_response.json()
                return SocialPostResult(
                    platform=SocialPlatform.LINKEDIN,
                    success=True,
                    post_id=data.get("id")
                )

            except Exception as e:
                return SocialPostResult(
                    platform=SocialPlatform.LINKEDIN,
                    success=False,
                    error_message=str(e)
                )

    async def _post_linkedin_text_only(
        self,
        user_urn: str,
        access_token: str,
        caption: str,
        image_url: str
    ) -> SocialPostResult:
        """Fallback: Post to LinkedIn with text only (include image URL in text)"""
        async with httpx.AsyncClient() as client:
            try:
                post_response = await client.post(
                    "https://api.linkedin.com/v2/ugcPosts",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                    json={
                        "author": f"urn:li:person:{user_urn}",
                        "lifecycleState": "PUBLISHED",
                        "specificContent": {
                            "com.linkedin.ugc.ShareContent": {
                                "shareCommentary": {"text": f"{caption}\n\n{image_url}"},
                                "shareMediaCategory": "ARTICLE",
                                "media": [{
                                    "status": "READY",
                                    "originalUrl": image_url,
                                }]
                            }
                        },
                        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
                    }
                )

                if post_response.status_code not in [200, 201]:
                    return SocialPostResult(
                        platform=SocialPlatform.LINKEDIN,
                        success=False,
                        error_message=f"Failed to post: {post_response.text}"
                    )

                data = post_response.json()
                return SocialPostResult(
                    platform=SocialPlatform.LINKEDIN,
                    success=True,
                    post_id=data.get("id")
                )

            except Exception as e:
                return SocialPostResult(
                    platform=SocialPlatform.LINKEDIN,
                    success=False,
                    error_message=str(e)
                )
