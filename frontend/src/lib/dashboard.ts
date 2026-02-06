import { api } from './api'

export type DashboardStats = {
  total_tasks: number
  in_progress: number      // design_status = Working
  pending_approval: number // design_status = Completed AND approval_status in [Pending, AdminApproved]
  completed: number        // approval_status = Approved (fully approved)
  overdue: number
}

// Get role-aware dashboard stats
// isDesigner = true: fetch only the designer's tasks
// isDesigner = false: fetch all tasks (admin view)
export async function getDashboardStats(isDesigner: boolean = false): Promise<DashboardStats> {
  try {
    // Use different endpoints based on role
    const tasksEndpoint = isDesigner ? '/tasks/my' : '/tasks/'

    const [tasksRes] = await Promise.all([
      api.get(tasksEndpoint),
    ])

    const tasks = tasksRes.data || []

    // Calculate stats from tasks with CORRECT status mappings

    // In Progress: Designer is actively working on it
    const inProgress = tasks.filter((t: any) => t.design_status === 'Working').length

    // Pending Approval: Design is done, waiting for any approval (admin or final)
    const pendingApproval = tasks.filter(
      (t: any) => t.design_status === 'Completed' &&
        (t.approval_status === 'Pending' || t.approval_status === 'AdminApproved')
    ).length

    // Completed: Fully approved by Approver (final state)
    const completed = tasks.filter(
      (t: any) => t.approval_status === 'Approved'
    ).length

    // Overdue: tasks with deadline in the past and not fully approved
    const now = new Date()
    const overdue = tasks.filter((t: any) => {
      if (!t.deadline) return false
      if (t.approval_status === 'Approved') return false
      return new Date(t.deadline) < now
    }).length

    return {
      total_tasks: tasks.length,
      in_progress: inProgress,
      pending_approval: pendingApproval,
      completed: completed,
      overdue: overdue,
    }
  } catch (err) {
    console.error('Failed to get dashboard stats:', err)
    return {
      total_tasks: 0,
      in_progress: 0,
      pending_approval: 0,
      completed: 0,
      overdue: 0,
    }
  }
}

