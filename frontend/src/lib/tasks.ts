import { api } from './api'

// ============= Types =============

export type DesignStatus = 'Pending' | 'Working' | 'OnHold' | 'Completed' | 'Discarded' | 'NotCompleted'
export type ApprovalStatus = 'Pending' | 'AdminApproved' | 'Approved' | 'ChangesRequired' | 'Rejected' | 'OnHold'
export type PostingStatus = 'Draft' | 'Scheduled' | 'Posted' | 'Failed'

// Content For / Entity options
export type ContentForEntity = 'FES' | 'FES UAE' | 'Daphne by Mona' | 'Haitham College' | 'FES AID' | 'IELTS by FES'

export const CONTENT_FOR_OPTIONS: { value: ContentForEntity; label: string }[] = [
  { value: 'FES', label: 'FES' },
  { value: 'FES UAE', label: 'FES UAE' },
  { value: 'Daphne by Mona', label: 'Daphne by Mona' },
  { value: 'Haitham College', label: 'Haitham College' },
  { value: 'FES AID', label: 'FES AID' },
  { value: 'IELTS by FES', label: 'IELTS by FES' },
]

export interface DesignerUpload {
  url: string
  uploaded_at: string
  revision: number
}

export interface Task {
  id: string
  title: string
  content_type: string
  size?: string | null
  content?: string | null
  instructions?: string | null
  deadline?: string | null
  tags: string[]
  content_for?: ContentForEntity | null
  is_urgent: boolean
  reference_images: string[]

  assigned_by_id: string
  designer_id?: string | null

  // Human-readable names (resolved from IDs)
  assigned_by_name?: string | null
  designer_name?: string | null

  design_status: DesignStatus
  approval_status: ApprovalStatus
  posting_status: PostingStatus

  approval_comment?: string | null
  designer_uploads: DesignerUpload[]

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
  content_for?: ContentForEntity | null
  is_urgent?: boolean
  reference_images?: string[]
}

export interface TaskUpdate {
  title?: string | null
  content?: string | null
  instructions?: string | null
  deadline?: string | null
  tags?: string[] | null
  content_for?: ContentForEntity | null
  is_urgent?: boolean | null
  reference_images?: string[] | null
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  author_name?: string | null  // Human-readable name
  author_role: string
  content: string
  created_at: string
}

export interface TaskHistory {
  id: string
  task_id: string
  action: string
  performed_by: string
  performed_by_name?: string | null  // Human-readable name
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

export async function getTask(taskId: string): Promise<Task> {
  const { data } = await api.get(`/tasks/${taskId}`)
  return data
}

export async function createTask(task: TaskCreate): Promise<Task> {
  const { data } = await api.post('/tasks/', task)
  return data
}

export async function updateTask(taskId: string, updates: TaskUpdate): Promise<Task> {
  const { data } = await api.patch(`/tasks/${taskId}`, updates)
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

export async function completeTask(taskId: string, designerUploadUrl?: string): Promise<Task> {
  const body = designerUploadUrl ? { designer_upload_url: designerUploadUrl } : undefined
  const { data } = await api.post(`/tasks/${taskId}/complete`, body)
  return data
}

export async function uploadToTask(taskId: string, url: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/upload`, { url })
  return data
}

// ============= Two-Layer Approval =============

// Admin approval endpoints
export async function getPendingAdminApprovalTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks/pending-admin-approval')
  return data
}

export async function adminApproveTask(taskId: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/admin-approve`)
  return data
}

export async function adminRequestChanges(taskId: string, comment: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/admin-request-changes`, { comment })
  return data
}

// Approver (final) approval endpoints
export async function getPendingFinalApprovalTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks/pending-final-approval')
  return data
}

export async function finalApproveTask(taskId: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/final-approve`)
  return data
}

export async function approverRequestChanges(taskId: string, comment: string): Promise<Task> {
  const { data } = await api.post(`/tasks/${taskId}/approver-request-changes`, { comment })
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
