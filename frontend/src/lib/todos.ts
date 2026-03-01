import { api } from './api'

// ============= Types =============

export interface Todo {
    id: string
    title: string
    description?: string
    status: 'todo' | 'in_progress' | 'done'
    priority: 'low' | 'medium' | 'high'
    due_date?: string
    reminder_datetime?: string
    tags: string[]
    assigned_to: string[]
    linked_task_id?: string
    visible_to_all: boolean
    created_by: string
    created_by_name?: string
    created_at: string
    updated_at: string
}

export interface TodoCreate {
    title: string
    description?: string
    priority?: 'low' | 'medium' | 'high'
    due_date?: string
    reminder_datetime?: string
    tags?: string[]
    assigned_to?: string[]
    linked_task_id?: string
    visible_to_all?: boolean
}

export interface TodoUpdate {
    title?: string
    description?: string
    status?: 'todo' | 'in_progress' | 'done'
    priority?: 'low' | 'medium' | 'high'
    due_date?: string
    reminder_datetime?: string
    tags?: string[]
    assigned_to?: string[]
}

// ============= API Functions =============

export async function createTodo(data: TodoCreate): Promise<Todo> {
    const { data: todo } = await api.post('/todos/', data)
    return todo
}

export async function getTodos(status?: string, priority?: string): Promise<Todo[]> {
    const { data } = await api.get('/todos/', { params: { status, priority } })
    return data
}

export async function getTodosToday(): Promise<Todo[]> {
    const { data } = await api.get('/todos/today')
    return data
}

export async function getTodosUpcoming(): Promise<Todo[]> {
    const { data } = await api.get('/todos/upcoming')
    return data
}

export async function getTodosOverdue(): Promise<Todo[]> {
    const { data } = await api.get('/todos/overdue')
    return data
}

export async function updateTodo(id: string, data: TodoUpdate): Promise<Todo> {
    const { data: todo } = await api.patch(`/todos/${id}`, data)
    return todo
}

export async function deleteTodo(id: string): Promise<void> {
    await api.delete(`/todos/${id}`)
}
