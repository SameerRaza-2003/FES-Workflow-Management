import { api } from './api'

// ============= Types =============

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin'

export interface SocialConnection {
    id: string
    platform: SocialPlatform
    platform_user_id: string
    platform_username: string
    page_id?: string
    page_name?: string
    connected_at: string
    is_expired: boolean
}

export interface SocialPostCreate {
    image_url: string
    caption: string
    platforms: SocialPlatform[]
}

export interface SocialPostResult {
    platform: SocialPlatform
    success: boolean
    post_id?: string
    error_message?: string
}

export interface SocialPostResponse {
    results: SocialPostResult[]
    successful_count: number
    failed_count: number
}

// ============= API Functions =============

export async function getSocialConnections(): Promise<SocialConnection[]> {
    const { data } = await api.get('/social/connections')
    return data
}

export async function startOAuth(platform: SocialPlatform): Promise<{ auth_url: string, state: string }> {
    const { data } = await api.get(`/social/auth/${platform}`)
    return data
}

export async function disconnectSocial(connectionId: string): Promise<void> {
    await api.delete(`/social/connections/${connectionId}`)
}

export async function createSocialPost(postData: SocialPostCreate): Promise<SocialPostResponse> {
    const { data } = await api.post('/social/post', postData)
    return data
}
