import { api } from './api'

export type DashboardStats = {
  total_tasks: number
  in_progress: number
  pending_approval: number
  overdue: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    overdueRes,
    atRiskRes,
    stuckRes,
    tasksRes,
  ] = await Promise.all([
    api.get('/analytics/bottlenecks/overdue'),
    api.get('/analytics/bottlenecks/at-risk'),
    api.get('/analytics/bottlenecks/stuck'),
    api.get('/tasks/'),
  ])

  const tasks = tasksRes.data

  return {
    total_tasks: tasks.length,
    in_progress: tasks.filter((t: any) => t.design_status === 'Working').length,
    pending_approval: tasks.filter(
      (t: any) => t.approval_status === 'Pending'
    ).length,
    overdue: overdueRes.data.length,
  }
}
