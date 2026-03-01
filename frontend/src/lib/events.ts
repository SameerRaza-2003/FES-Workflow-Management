import { api } from './api'

// ============= Types =============

export interface CalendarEvent {
    id: string
    title: string
    description?: string
    start_datetime: string
    end_datetime: string
    participants: string[]
    color_label: string
    event_type: 'meeting' | 'deadline' | 'review' | 'other'
    created_by: string
    created_by_name?: string
    created_at: string
}

export interface EventCreate {
    title: string
    description?: string
    start_datetime: string
    end_datetime: string
    participants?: string[]
    color_label?: string
    event_type?: 'meeting' | 'deadline' | 'review' | 'other'
}

export interface EventUpdate {
    title?: string
    description?: string
    start_datetime?: string
    end_datetime?: string
    participants?: string[]
    color_label?: string
    event_type?: 'meeting' | 'deadline' | 'review' | 'other'
}

// ============= API Functions =============

export async function createEvent(data: EventCreate): Promise<CalendarEvent> {
    const { data: event } = await api.post('/events/', data)
    return event
}

export async function getEventsByMonth(month: string): Promise<CalendarEvent[]> {
    const { data } = await api.get('/events/', { params: { month } })
    return data
}

export async function getEventsByDay(date: string): Promise<CalendarEvent[]> {
    const { data } = await api.get('/events/day', { params: { date } })
    return data
}

export async function updateEvent(id: string, data: EventUpdate): Promise<CalendarEvent> {
    const { data: event } = await api.patch(`/events/${id}`, data)
    return event
}

export async function deleteEvent(id: string): Promise<void> {
    await api.delete(`/events/${id}`)
}
