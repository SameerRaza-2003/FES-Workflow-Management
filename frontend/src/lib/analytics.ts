import { api } from './api'

// ============= Types =============

export interface DesignerPerformance {
    designer_id: string
    designer_name?: string
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

export interface AssignerPerformance {
    assigner_id: string
    assigner_name?: string
    total_assigned: number
    completed: number
    approved: number
    pending_approval: number
    in_progress: number
    approval_rate: number
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

export async function getAllDesignersPerformance(startDate?: string, endDate?: string): Promise<DesignerPerformance[]> {
    const { data } = await api.get('/analytics/performance/designers', {
        params: { start_date: startDate, end_date: endDate },
    })
    return data
}

export async function getAllAssignersPerformance(startDate?: string, endDate?: string): Promise<AssignerPerformance[]> {
    const { data } = await api.get('/analytics/performance/assigners', {
        params: { start_date: startDate, end_date: endDate },
    })
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
