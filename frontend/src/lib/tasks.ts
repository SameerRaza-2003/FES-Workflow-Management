import { api } from '@/lib/api'

export type DesignStatus =
  | 'Pending'
  | 'Working'
  | 'Completed'
  | 'OnHold'
  | 'Discarded'
  | 'NotCompleted'

export type ApprovalStatus =
  | 'Pending'
  | 'Approved'
  | 'ChangesRequired'
  | 'Rejected'
  | 'OnHold'

export interface Task {
  id: string
  title: string
  content_type: string
  designer_id: string | null
  design_status: DesignStatus
  approval_status: ApprovalStatus
  posting_status: string
  deadline: string | null
  created_at: string
}

export async function getTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks/')
  return data
}
