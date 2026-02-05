import { api } from './api'

export type Task = {
  id: string
  content_type: string
  title: string
  design_status: string
  approval_status: string
  posting_status: string
  designer_id: string | null
  deadline: string
}

export async function getTasks(): Promise<Task[]> {
  const { data } = await api.get('/tasks/')
  return data
}
