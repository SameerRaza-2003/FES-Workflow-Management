'use client'

import { cn } from '@/lib/utils'

export type BadgeVariant = 
  | 'default'
  | 'pending'
  | 'working'
  | 'completed'
  | 'approved'
  | 'changes'
  | 'onhold'
  | 'discarded'
  | 'draft'
  | 'scheduled'
  | 'posted'
  | 'failed'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-zinc-100 text-zinc-700',
  pending: 'bg-blue-100 text-blue-700',
  working: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
  changes: 'bg-red-100 text-red-700',
  onhold: 'bg-purple-100 text-purple-700',
  discarded: 'bg-zinc-100 text-zinc-600',
  draft: 'bg-zinc-100 text-zinc-600',
  scheduled: 'bg-sky-100 text-sky-700',
  posted: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
}

const dotStyles: Record<BadgeVariant, string> = {
  default: 'bg-zinc-500',
  pending: 'bg-blue-500',
  working: 'bg-amber-500',
  completed: 'bg-emerald-500',
  approved: 'bg-emerald-500',
  changes: 'bg-red-500',
  onhold: 'bg-purple-500',
  discarded: 'bg-zinc-400',
  draft: 'bg-zinc-400',
  scheduled: 'bg-sky-500',
  posted: 'bg-emerald-500',
  failed: 'bg-red-500',
}

export function Badge({ 
  children, 
  variant = 'default', 
  className,
  dot = false 
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', dotStyles[variant])} />
      )}
      {children}
    </span>
  )
}

// Helper to map backend status to badge variant
export function getDesignStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    'Pending': 'pending',
    'Working': 'working',
    'OnHold': 'onhold',
    'Completed': 'completed',
    'Discarded': 'discarded',
    'NotCompleted': 'changes',
  }
  return map[status] || 'default'
}

export function getApprovalStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    'Pending': 'pending',
    'Approved': 'approved',
    'ChangesRequired': 'changes',
    'Rejected': 'failed',
    'OnHold': 'onhold',
  }
  return map[status] || 'default'
}

export function getPostingStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    'Draft': 'draft',
    'Scheduled': 'scheduled',
    'Posted': 'posted',
    'Failed': 'failed',
  }
  return map[status] || 'default'
}
