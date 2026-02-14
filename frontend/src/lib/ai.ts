import { api } from './api'

// ============= Types =============

export interface CaptionRequest {
    brand: string
    topic: string
    tone?: string
    platform?: string
}

export interface TaskDescriptionRequest {
    title: string
    content_type?: string
    brand?: string
}

export interface CommentItem {
    author: string
    role: string
    content: string
}

export interface SummarizeRequest {
    comments: CommentItem[]
    task_title?: string
}

export interface AnalyticsInsightsRequest {
    total_tasks: number
    completed_tasks: number
    completion_rate: number
    overdue_count: number
    at_risk_count: number
    top_designer?: string
    top_designer_completed?: number
    avg_completion_days?: number
    designers_count?: number
}

// ============= API Functions =============

export async function generateCaption(req: CaptionRequest): Promise<string> {
    const { data } = await api.post('/ai/generate-caption', req)
    return data.caption
}

export async function generateTaskDescription(req: TaskDescriptionRequest): Promise<{ description: string; instructions: string }> {
    const { data } = await api.post('/ai/generate-task-description', req)
    return { description: data.description, instructions: data.instructions }
}

export async function summarizeComments(req: SummarizeRequest): Promise<string> {
    const { data } = await api.post('/ai/summarize-comments', req)
    return data.summary
}

export async function generateAnalyticsInsights(req: AnalyticsInsightsRequest): Promise<string> {
    const { data } = await api.post('/ai/analytics-insights', req)
    return data.insights
}
