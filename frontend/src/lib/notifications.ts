import { api } from './api'

export interface Notification {
  id: string
  user_id: string
  type: string
  message: string
  task_id?: string | null
  is_read: boolean
  created_at: string
}

export async function getNotifications(): Promise<Notification[]> {
  const { data } = await api.get('/notifications/')
  return data
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await api.post(`/notifications/${notificationId}/read`)
}

export async function markAllNotificationsRead(notifications: Notification[]): Promise<void> {
  const unread = notifications.filter(n => !n.is_read)
  await Promise.all(unread.map(n => markNotificationRead(n.id)))
}
