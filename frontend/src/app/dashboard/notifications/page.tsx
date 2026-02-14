'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/dashboard/TopBar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { getNotifications, markNotificationRead, markAllNotificationsRead, Notification } from '@/lib/notifications'
import {
    Bell,
    CheckCheck,
    FileText,
    UserPlus,
    CheckCircle2,
    AlertCircle,
    MessageSquare,
    Play,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ReactNode> = {
    task_assigned: <UserPlus className="w-4 h-4" />,
    task_started: <Play className="w-4 h-4" />,
    task_completed: <CheckCircle2 className="w-4 h-4" />,
    task_approved: <CheckCircle2 className="w-4 h-4" />,
    changes_requested: <AlertCircle className="w-4 h-4" />,
    comment_added: <MessageSquare className="w-4 h-4" />,
}

const colorMap: Record<string, string> = {
    task_assigned: 'bg-blue-100 text-blue-600',
    task_started: 'bg-amber-100 text-amber-600',
    task_completed: 'bg-emerald-100 text-emerald-600',
    task_approved: 'bg-emerald-100 text-emerald-600',
    changes_requested: 'bg-red-100 text-red-600',
    comment_added: 'bg-purple-100 text-purple-600',
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    return date.toLocaleDateString()
}

export default function NotificationsPage() {
    const { showToast } = useToast()

    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'unread'>('all')

    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async () => {
        setLoading(true)
        try {
            const data = await getNotifications()
            setNotifications(data)
        } catch (err) {
            console.error('Failed to load notifications:', err)
            showToast('error', 'Failed to load notifications')
        } finally {
            setLoading(false)
        }
    }

    const handleMarkRead = async (id: string) => {
        try {
            await markNotificationRead(id)
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            )
        } catch (err) {
            showToast('error', 'Failed to mark as read')
        }
    }

    const handleMarkAllRead = async () => {
        try {
            await markAllNotificationsRead(notifications)
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
            showToast('success', 'All notifications marked as read')
        } catch (err) {
            showToast('error', 'Failed to mark all as read')
        }
    }

    const filteredNotifications =
        filter === 'unread'
            ? notifications.filter((n) => !n.is_read)
            : notifications

    const unreadCount = notifications.filter((n) => !n.is_read).length

    return (
        <>
            <TopBar
                title="Notifications"
                subtitle={`${unreadCount} unread`}
            />

            <main className="px-6 lg:px-10 py-8">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilter('all')}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-sm font-medium transition',
                                    filter === 'all'
                                        ? 'bg-zinc-900 text-white'
                                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
                                )}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setFilter('unread')}
                                className={cn(
                                    'px-4 py-2 rounded-xl text-sm font-medium transition',
                                    filter === 'unread'
                                        ? 'bg-zinc-900 text-white'
                                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
                                )}
                            >
                                Unread
                                {unreadCount > 0 && (
                                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                        </div>

                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                onClick={handleMarkAllRead}
                                className="gap-2 rounded-xl"
                            >
                                <CheckCheck className="w-4 h-4" />
                                Mark all read
                            </Button>
                        )}
                    </div>

                    {/* Notifications List */}
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Card key={i} className="rounded-2xl">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Skeleton className="w-10 h-10 rounded-full" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-3/4" />
                                                <Skeleton className="h-3 w-1/4" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <EmptyState type="notifications" />
                    ) : (
                        <div className="space-y-3">
                            {filteredNotifications.map((notification, index) => (
                                <Card
                                    key={notification.id}
                                    className={cn(
                                        'rounded-2xl border-zinc-200/50 transition animate-fade-in hover-lift cursor-pointer',
                                        !notification.is_read && 'bg-emerald-50/30 border-emerald-200/50'
                                    )}
                                    style={{ animationDelay: `${index * 30}ms` }}
                                    onClick={() => !notification.is_read && handleMarkRead(notification.id)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-4">
                                            <div
                                                className={cn(
                                                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                                                    colorMap[notification.type] || 'bg-zinc-100 text-zinc-600'
                                                )}
                                            >
                                                {iconMap[notification.type] || <Bell className="w-4 h-4" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={cn(
                                                        'text-sm',
                                                        notification.is_read ? 'text-zinc-600' : 'text-zinc-900 font-medium'
                                                    )}
                                                >
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-zinc-400 mt-1">
                                                    {formatTimeAgo(notification.created_at)}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {!notification.is_read && (
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                )}
                                                {notification.task_id && (
                                                    <Link
                                                        href={`/dashboard/tasks/${notification.task_id}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-xs text-emerald-600 hover:underline"
                                                    >
                                                        View Task
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </>
    )
}
