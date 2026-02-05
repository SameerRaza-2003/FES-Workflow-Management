'use client'

import KPICard from './KPICard'
import { DashboardStats } from '@/lib/dashboard'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hourglass
} from 'lucide-react'

interface KPISectionProps {
  stats: DashboardStats | null
}

export default function KPISection({ stats }: KPISectionProps) {
  const total = stats?.total_tasks ?? 0
  const inProgress = stats?.in_progress ?? 0
  const pendingApproval = stats?.pending_approval ?? 0
  const completed = Math.max(total - inProgress - pendingApproval, 0)
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard
        title="Total Tasks"
        value={total}
        subtitle="All active tasks"
        icon={<CheckSquare className="w-5 h-5" />}
        color="blue"
      />

      <KPICard
        title="In Progress"
        value={inProgress}
        subtitle="Currently being worked on"
        icon={<Clock className="w-5 h-5" />}
        color="amber"
      />

      <KPICard
        title="Pending Approval"
        value={pendingApproval}
        subtitle="Awaiting review"
        icon={<Hourglass className="w-5 h-5" />}
        color="purple"
      />

      <KPICard
        title="Completed"
        value={completed}
        subtitle={`${completionRate}% completion rate`}
        icon={<CheckCircle2 className="w-5 h-5" />}
        color="emerald"
        trend={completionRate >= 50 ? 'up' : completionRate > 0 ? 'neutral' : undefined}
        trendValue={completionRate >= 50 ? 'On track' : undefined}
      />
    </div>
  )
}
