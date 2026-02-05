import KPICard from './KPICard'
import { DashboardStats } from '@/lib/dashboard'

type Props = {
  stats: DashboardStats | null
}

export default function KPISection({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <KPICard label="Total Tasks" value={stats?.total_tasks} />
      <KPICard label="In Progress" value={stats?.in_progress} />
      <KPICard label="Pending Approval" value={stats?.pending_approval} />
      <KPICard label="Overdue" value={stats?.overdue} />
    </div>
  )
}
