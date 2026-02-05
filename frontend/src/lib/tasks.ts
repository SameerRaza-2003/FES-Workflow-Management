import { api } from './api'

// ============= Types =============

export type DesignStatus = 'Pending' | 'Working' | 'OnHold' | 'Completed' | 'Discarded' | 'NotCompleted'
export type ApprovalStatus = 'Pending' | 'Approved' | 'ChangesRequired' | 'Rejected' | 'OnHold'
export type PostingStatus = 'Draft' | 'Scheduled' | 'Posted' | 'Failed'

export interface Task {
  id: string
  title: string
  content_type: string
  size?: string | null
  content?: string | null
  instructions?: string | null
  deadline?: string | null
  tags: string[]
  assigned_by_id: string
  designer_id?: string | null
  design_status: DesignStatus
  approval_status: ApprovalStatus
  posting_status: PostingStatus
  created_at: string
  updated_at: string
}

export interface TaskCreate {
  content_type: string
  size?: string | null
  title: string
  content?: string | null
  instructions?: string | null
  deadline?: string | null
  tags?: string[]
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  author_role: string
  content: string
  created_at: string
}

export interface TaskHistory {
  id: string
  task_id: string
  action: string
  performed_by: string
  role: string
  comment?: string | null
  created_at: string
}

// ============= Task CRUD =============

export async function getTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks/')
  return data
}

export async function getMyTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks/my')
  return data
}

export async function getPendingApprovalTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks/pending-approval')
  return data
}

export async function getTask(taskId: string): Promise<Task> {
  const { data } = await api.get(`/tasks/${taskId}`)
  return data
}

export async function createTask(task: TaskCreate): Promise<Task> {
  const { data } = await api.post('/tasks/', task)
  return data
}

// ============= Task Actions =============

export async function assignDesigner(taskId: string, designerId: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/assign`, { designer_id: designerId })
  return data
}

export async function startTask(taskId: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/start`)
  return data
}

export async function completeTask(taskId: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/complete`)
  return data
}

export async function approveTask(taskId: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/approve`)
  return data
}

export async function requestChanges(taskId: string, comment: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/request-changes`, { comment })
  return data
}

// ============= Comments & History =============

export async function getTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data } = await api.get(`/tasks/${taskId}/comments/`)
  return data
}

export async function addTaskComment(taskId: string, content: string): Promise<TaskComment> {
  const { data } = await api.post(`/tasks/${taskId}/comments/`, { content })
  return data
}

export async function getTaskHistory(taskId: string): Promise<TaskHistory[]> {
  const { data } = await api.get(`/tasks/${taskId}/history/`)
  return data
}
