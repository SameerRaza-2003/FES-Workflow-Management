import { api } from './api'

// ============= Types =============

export interface DesignerPerformance {
    designer_id: string
    completed: number
    pending: number
    total: number
    completion_rate: number
}

export interface MyPerformance {
    completed: number
    pending: number
    total: number
    completion_rate: number
}

export interface TaskRisk {
    task_id: string
    title: string
    designer_id?: string | null
    deadline?: string | null
    days_remaining?: number | null
}

export interface DesignerLoad {
    designer_id: string
    active_tasks: number
}

// ============= Performance APIs =============

export async function getAllDesignersPerformance(): Promise<DesignerPerformance[]> {
    const { data } = await api.get('/analytics/performance/designers')
    return data
}

export async function getMyPerformance(): Promise<MyPerformance> {
    const { data } = await api.get('/analytics/performance/me')
    return data
}

// ============= Bottleneck APIs =============

export async function getOverdueTasks(): Promise<TaskRisk[]> {
    const { data } = await api.get('/analytics/bottlenecks/overdue')
    return data
}

export async function getAtRiskTasks(days: number = 3): Promise<TaskRisk[]> {
    const { data } = await api.get('/analytics/bottlenecks/at-risk', { params: { days } })
    return data
}

export async function getDesignerLoad(threshold: number = 10): Promise<DesignerLoad[]> {
    const { data } = await api.get('/analytics/bottlenecks/designer-load', { params: { threshold } })
    return data
}

export async function getStuckTasks(days: number = 5): Promise<TaskRisk[]> {
    const { data } = await api.get('/analytics/bottlenecks/stuck', { params: { days } })
    return data
}
