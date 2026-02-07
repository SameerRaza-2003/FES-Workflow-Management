'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import TopBar from '@/components/dashboard/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonKPI } from '@/components/ui/Skeleton'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/Toast'
import {
    getSocialConnections,
    startOAuth,
    disconnectSocial,
    createSocialPost,
    SocialConnection,
    SocialPlatform,
} from '@/lib/social'
import {
    Instagram,
    Facebook,
    Linkedin,
    Link2,
    Unlink,
    Send,
    Image as ImageIcon,
    Check,
    X,
    Loader2,
    ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PLATFORM_CONFIG: Record<SocialPlatform, { name: string, icon: React.ReactNode, color: string, bgColor: string }> = {
    instagram: {
        name: 'Instagram',
        icon: <Instagram className="w-5 h-5" />,
        color: 'text-pink-600',
        bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    },
    facebook: {
        name: 'Facebook',
        icon: <Facebook className="w-5 h-5" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-600',
    },
    linkedin: {
        name: 'LinkedIn',
        icon: <Linkedin className="w-5 h-5" />,
        color: 'text-blue-700',
        bgColor: 'bg-blue-700',
    },
}

export default function PostingPage() {
    const { isAdmin } = useAuth()
    const { showToast } = useToast()
    const searchParams = useSearchParams()

    const [loading, setLoading] = useState(true)
    const [connections, setConnections] = useState<SocialConnection[]>([])
    const [connecting, setConnecting] = useState<SocialPlatform | null>(null)
    const [disconnecting, setDisconnecting] = useState<string | null>(null)

    // Post form state
    const [imageUrl, setImageUrl] = useState('')
    const [caption, setCaption] = useState('')
    const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([])
    const [posting, setPosting] = useState(false)
    const [postResults, setPostResults] = useState<{ platform: SocialPlatform, success: boolean, error?: string }[] | null>(null)

    const loadConnections = useCallback(async () => {
        try {
            const data = await getSocialConnections()
            setConnections(data)
        } catch (err) {
            console.error('Failed to load connections:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadConnections()

        // Check for OAuth callback result
        const connected = searchParams.get('connected')
        if (connected && connected !== 'none') {
            showToast('success', `Connected: ${decodeURIComponent(connected)}`)
        }
    }, [loadConnections, searchParams, showToast])

    const handleConnect = async (platform: SocialPlatform) => {
        setConnecting(platform)
        try {
            const { auth_url } = await startOAuth(platform)
            window.location.href = auth_url
        } catch (err) {
            showToast('error', 'Failed to start connection')
            setConnecting(null)
        }
    }

    const handleDisconnect = async (connectionId: string) => {
        setDisconnecting(connectionId)
        try {
            await disconnectSocial(connectionId)
            setConnections(prev => prev.filter(c => c.id !== connectionId))
            showToast('success', 'Account disconnected')
        } catch (err) {
            showToast('error', 'Failed to disconnect')
        } finally {
            setDisconnecting(null)
        }
    }

    const togglePlatform = (platform: SocialPlatform) => {
        setSelectedPlatforms(prev =>
            prev.includes(platform)
                ? prev.filter(p => p !== platform)
                : [...prev, platform]
        )
    }

    const handlePost = async () => {
        if (!imageUrl.trim()) {
            showToast('error', 'Please enter an image URL')
            return
        }
        if (!caption.trim()) {
            showToast('error', 'Please enter a caption')
            return
        }
        if (selectedPlatforms.length === 0) {
            showToast('error', 'Please select at least one platform')
            return
        }

        setPosting(true)
        setPostResults(null)
        try {
            const response = await createSocialPost({
                image_url: imageUrl,
                caption: caption,
                platforms: selectedPlatforms,
            })

            setPostResults(response.results.map(r => ({
                platform: r.platform,
                success: r.success,
                error: r.error_message,
            })))

            if (response.successful_count > 0) {
                showToast('success', `Posted to ${response.successful_count} platform(s)`)
            }
            if (response.failed_count > 0) {
                showToast('error', `Failed on ${response.failed_count} platform(s)`)
            }
        } catch (err: any) {
            showToast('error', err.response?.data?.detail || 'Failed to post')
        } finally {
            setPosting(false)
        }
    }

    const getConnection = (platform: SocialPlatform) => connections.find(c => c.platform === platform)

    const connectedPlatforms = connections.map(c => c.platform)

    if (!isAdmin) {
        return (
            <>
                <TopBar title="Posting" subtitle="Access denied" />
                <main className="px-6 lg:px-10 py-8">
                    <Card className="rounded-2xl border-red-200 bg-red-50">
                        <CardContent className="p-6 text-center text-red-600">
                            Only admins can access this feature.
                        </CardContent>
                    </Card>
                </main>
            </>
        )
    }

    return (
        <>
            <TopBar title="Social Posting" subtitle="Connect accounts and publish content" />

            <main className="px-6 lg:px-10 py-8 space-y-8">
                {/* Connected Accounts Section */}
                <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-emerald-500" />
                            Connected Accounts
                        </h2>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[...Array(3)].map((_, i) => <SkeletonKPI key={i} />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {(['instagram', 'facebook', 'linkedin'] as SocialPlatform[]).map(platform => {
                                    const config = PLATFORM_CONFIG[platform]
                                    const connection = getConnection(platform)
                                    const isConnected = !!connection

                                    return (
                                        <div
                                            key={platform}
                                            className={cn(
                                                "relative overflow-hidden rounded-xl border p-4 transition-all",
                                                isConnected
                                                    ? "border-emerald-200 bg-emerald-50/50"
                                                    : "border-zinc-200 bg-zinc-50/50"
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", config.bgColor)}>
                                                        {config.icon}
                                                    </div>
                                                    <span className="font-medium text-zinc-900">{config.name}</span>
                                                </div>
                                                {isConnected && (
                                                    <Badge variant="approved">Connected</Badge>
                                                )}
                                            </div>

                                            {isConnected ? (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-zinc-600">
                                                        {connection.platform_username}
                                                        {connection.page_name && ` (${connection.page_name})`}
                                                    </p>
                                                    {connection.is_expired && (
                                                        <Badge variant="pending">Token Expired</Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDisconnect(connection.id)}
                                                        disabled={disconnecting === connection.id}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        {disconnecting === connection.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Unlink className="w-4 h-4" />
                                                        )}
                                                        <span className="ml-1">Disconnect</span>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleConnect(platform)}
                                                    disabled={connecting === platform}
                                                    className="w-full"
                                                >
                                                    {connecting === platform ? (
                                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                    ) : (
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                    )}
                                                    Connect {config.name}
                                                </Button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Create Post Section */}
                <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5 text-blue-500" />
                            Create Post
                        </h2>

                        <div className="space-y-4">
                            {/* Image URL */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">
                                    Image URL
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                        <Input
                                            value={imageUrl}
                                            onChange={e => setImageUrl(e.target.value)}
                                            placeholder="https://example.com/image.jpg"
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                {imageUrl && (
                                    <div className="mt-2 rounded-lg overflow-hidden border border-zinc-200 w-48 h-48">
                                        <img
                                            src={imageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Caption */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">
                                    Caption
                                </label>
                                <textarea
                                    value={caption}
                                    onChange={e => setCaption(e.target.value)}
                                    placeholder="Write your caption here..."
                                    rows={4}
                                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                                />
                            </div>

                            {/* Platform Selection */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-2">
                                    Post to
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {connectedPlatforms.map(platform => {
                                        const config = PLATFORM_CONFIG[platform]
                                        const isSelected = selectedPlatforms.includes(platform)

                                        return (
                                            <button
                                                key={platform}
                                                onClick={() => togglePlatform(platform)}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                                                    isSelected
                                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                                                )}
                                            >
                                                <div className={cn("w-5 h-5", config.color)}>
                                                    {config.icon}
                                                </div>
                                                {config.name}
                                                {isSelected && <Check className="w-4 h-4" />}
                                            </button>
                                        )
                                    })}
                                    {connectedPlatforms.length === 0 && (
                                        <p className="text-sm text-zinc-500">
                                            Connect at least one platform above to post.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Post Results */}
                            {postResults && (
                                <div className="space-y-2 p-4 bg-zinc-50 rounded-lg">
                                    <h3 className="text-sm font-medium text-zinc-700">Results:</h3>
                                    {postResults.map(result => (
                                        <div
                                            key={result.platform}
                                            className={cn(
                                                "flex items-center gap-2 text-sm",
                                                result.success ? "text-emerald-600" : "text-red-600"
                                            )}
                                        >
                                            {result.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                            {PLATFORM_CONFIG[result.platform].name}:
                                            {result.success ? " Posted successfully" : ` ${result.error}`}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                onClick={handlePost}
                                disabled={posting || connectedPlatforms.length === 0}
                                className="w-full"
                            >
                                {posting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Posting...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Post to {selectedPlatforms.length || 0} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </>
    )
}
