'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import { uploadImage } from '@/lib/upload'
import { generateCaption } from '@/lib/ai'
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
    Upload,
    Sparkles,
    Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ──────────────────────────────────────────────
   Platform display config
   Instagram kept here for post results rendering
   ────────────────────────────────────────────── */
const PLATFORM_CONFIG: Record<SocialPlatform, { name: string; icon: React.ReactNode; color: string; bgColor: string }> = {
    instagram: {
        name: 'Instagram',
        icon: <Instagram className="w-5 h-5" />,
        color: 'text-pink-600',
        bgColor: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    },
    facebook: {
        name: 'Meta Account',
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

/* Only these platforms get a connect card */
const CONNECTABLE_PLATFORMS: SocialPlatform[] = ['facebook', 'linkedin']

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
    const [postResults, setPostResults] = useState<{ platform: SocialPlatform; success: boolean; error?: string }[] | null>(null)

    // Upload state
    const [uploading, setUploading] = useState(false)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // AI caption state
    const [showAiCaption, setShowAiCaption] = useState(false)
    const [aiTopic, setAiTopic] = useState('')
    const [aiTone, setAiTone] = useState('professional')
    const [generatingCaption, setGeneratingCaption] = useState(false)

    const handleGenerateCaption = async () => {
        if (!aiTopic.trim()) return
        setGeneratingCaption(true)
        try {
            const result = await generateCaption({
                brand: 'FES',
                topic: aiTopic,
                tone: aiTone,
                platform: selectedPlatforms[0] || 'general',
            })
            setCaption(result)
            setShowAiCaption(false)
            setAiTopic('')
            showToast('success', 'Caption generated!')
        } catch (err: any) {
            showToast('error', err.response?.data?.detail || 'Failed to generate caption')
        } finally {
            setGeneratingCaption(false)
        }
    }

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

    /* ─── Image Upload ─── */
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const allowed = ['image/png', 'image/jpeg', 'image/webp']
        if (!allowed.includes(file.type)) {
            showToast('error', 'Only PNG, JPG, and WEBP images are allowed')
            return
        }

        setUploading(true)
        try {
            const result = await uploadImage(file)
            setImageUrl(result.url)
            showToast('success', 'Image uploaded successfully')
        } catch (err: any) {
            showToast('error', err.response?.data?.detail || 'Image upload failed')
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    /* ─── Post ─── */
    const handlePost = async () => {
        if (!imageUrl.trim()) {
            showToast('error', 'Please upload or enter an image')
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

            const results = response.results.map(r => ({
                platform: r.platform,
                success: r.success,
                error: r.error_message,
            }))
            setPostResults(results)

            const successCount = results.filter(r => r.success).length
            const failCount = results.filter(r => !r.success).length

            if (successCount > 0) {
                showToast('success', `Posted to ${successCount} platform(s)`)
            }
            if (failCount > 0) {
                showToast('error', `Failed on ${failCount} platform(s)`)
            }
        } catch (err: any) {
            showToast('error', err.response?.data?.detail || 'Failed to post')
        } finally {
            setPosting(false)
        }
    }

    const getConnection = (platform: SocialPlatform) => connections.find(c => c.platform === platform)

    const connectedPlatforms = connections
        .map(c => c.platform)
        .filter(p => CONNECTABLE_PLATFORMS.includes(p))

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
                {/* ─── Connected Accounts ─── */}
                <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-emerald-500" />
                            Connected Accounts
                        </h2>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...Array(2)].map((_, i) => <SkeletonKPI key={i} />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CONNECTABLE_PLATFORMS.map(platform => {
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

                {/* ─── Create Post ─── */}
                <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                            <Send className="w-5 h-5 text-blue-500" />
                            Create Post
                        </h2>

                        <div className="space-y-4">
                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 mb-1">
                                    Image
                                </label>

                                {/* Upload zone */}
                                <div
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
                                        uploading
                                            ? "border-emerald-300 bg-emerald-50/50 cursor-wait"
                                            : "border-zinc-200 hover:border-emerald-400 hover:bg-emerald-50/30"
                                    )}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                            <p className="text-sm text-emerald-600 font-medium">Uploading to Cloudinary...</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="w-8 h-8 text-zinc-400" />
                                            <p className="text-sm text-zinc-500">
                                                Click to upload <span className="font-medium">PNG, JPG, or WEBP</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Manual URL fallback */}
                                <button
                                    type="button"
                                    onClick={() => setShowUrlInput(!showUrlInput)}
                                    className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                                >
                                    {showUrlInput ? 'Hide URL input' : 'Or enter image URL manually'}
                                </button>

                                {showUrlInput && (
                                    <div className="mt-2 flex gap-2">
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
                                )}

                                {/* Image Preview */}
                                {imageUrl && (
                                    <div className="mt-3 relative rounded-lg overflow-hidden border border-zinc-200 w-48 h-48 group">
                                        <img
                                            src={imageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'
                                            }}
                                        />
                                        <button
                                            onClick={() => setImageUrl('')}
                                            className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Caption */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-zinc-700">
                                        Caption
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowAiCaption(!showAiCaption)}
                                        className="flex items-center gap-1.5 text-xs font-medium text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-full transition-all"
                                    >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        AI Caption
                                    </button>
                                </div>

                                {/* AI Caption Form */}
                                {showAiCaption && (
                                    <div className="mb-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50 rounded-xl space-y-3">
                                        <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                                            <Wand2 className="w-4 h-4" />
                                            Generate Caption with AI
                                        </div>
                                        <input
                                            value={aiTopic}
                                            onChange={e => setAiTopic(e.target.value)}
                                            placeholder="What's the post about? e.g. Summer sale, New product launch..."
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                value={aiTone}
                                                onChange={e => setAiTone(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                                            >
                                                <option value="professional">Professional</option>
                                                <option value="casual">Casual</option>
                                                <option value="witty">Witty</option>
                                                <option value="inspirational">Inspirational</option>
                                                <option value="promotional">Promotional</option>
                                            </select>
                                            <Button
                                                onClick={handleGenerateCaption}
                                                disabled={!aiTopic.trim() || generatingCaption}
                                                className="bg-purple-600 hover:bg-purple-700 text-white"
                                            >
                                                {generatingCaption ? (
                                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                                ) : (
                                                    <Sparkles className="w-4 h-4 mr-1" />
                                                )}
                                                Generate
                                            </Button>
                                        </div>
                                    </div>
                                )}

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
                                            {result.success ? " Posted successfully" : ` ${result.error || 'Unknown error'}`}
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
