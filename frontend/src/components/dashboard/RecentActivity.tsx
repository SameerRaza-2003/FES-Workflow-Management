'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { getNotifications, Notification } from '@/lib/notifications'
import { Avatar } from '@/components/ui/Avatar'
import {
  FileCheck,
  UserPlus,
  Play,
  CheckCircle2,
  AlertCircle,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const iconMap: Record<string, React.ReactNode> = {
  task_assigned: <UserPlus className="w-4 h-4" />,
  task_started: <Play className="w-4 h-4" />,
  task_completed: <CheckCircle2 className="w-4 h-4" />,
  task_approved: <FileCheck className="w-4 h-4" />,
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
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString()
}

export default function RecentActivity() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications()
      .then(data => setNotifications(data.slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="rounded-2xl border-zinc-200/50 shadow-soft">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-zinc-900">Recent Activity</h3>
          <Link
            href="/dashboard/notifications"
            className="text-sm text-emerald-600 hover:underline"
          >
            View all
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-zinc-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-zinc-200 rounded" />
                  <div className="h-3 w-1/4 bg-zinc-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3">
              <FileCheck className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-sm text-zinc-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification, i) => (
              <div
                key={notification.id}
                className={cn(
                  'flex items-start gap-3 animate-fade-in',
                  { 'opacity-0': loading }
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                  colorMap[notification.type] || 'bg-zinc-100 text-zinc-600'
                )}>
                  {iconMap[notification.type] || <FileCheck className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-700 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {formatTimeAgo(notification.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
