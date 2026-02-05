'use client'

import { cn } from '@/lib/utils'
import {
    Inbox,
    FileText,
    Bell,
    Search,
    CheckCircle2,
    BarChart3
} from 'lucide-react'

type EmptyStateType = 'tasks' | 'notifications' | 'search' | 'approvals' | 'analytics' | 'default'

interface EmptyStateProps {
    type?: EmptyStateType
    title?: string
    description?: string
    action?: React.ReactNode
    className?: string
}

const iconMap: Record<EmptyStateType, React.ReactNode> = {
    tasks: <FileText className="w-12 h-12" />,
    notifications: <Bell className="w-12 h-12" />,
    search: <Search className="w-12 h-12" />,
    approvals: <CheckCircle2 className="w-12 h-12" />,
    analytics: <BarChart3 className="w-12 h-12" />,
    default: <Inbox className="w-12 h-12" />,
}

const defaultContent: Record<EmptyStateType, { title: string; description: string }> = {
    tasks: {
        title: 'No tasks found',
        description: 'Create your first task to get started',
    },
    notifications: {
        title: 'All caught up!',
        description: 'You have no new notifications',
    },
    search: {
        title: 'No results found',
        description: 'Try adjusting your search or filters',
    },
    approvals: {
        title: 'No pending approvals',
        description: 'All tasks have been reviewed',
    },
    analytics: {
        title: 'No data available',
        description: 'Analytics will appear once tasks are created',
    },
    default: {
        title: 'Nothing here yet',
        description: 'Content will appear here when available',
    },
}

export function EmptyState({
    type = 'default',
    title,
    description,
    action,
    className
}: EmptyStateProps) {
    const content = defaultContent[type]

    return (
        <div className={cn(
            'flex flex-col items-center justify-center py-16 px-6 text-center',
            className
        )}>
            <div className="w-20 h-20 flex items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 mb-6">
                {iconMap[type]}
            </div>
            <h3 className="text-lg font-semibold text-zinc-900">
                {title || content.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm">
                {description || content.description}
            </p>
            {action && (
                <div className="mt-6">
                    {action}
                </div>
            )}
        </div>
    )
}
