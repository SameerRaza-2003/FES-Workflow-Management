import { api } from './api'

// ============= Types =============

export interface TaskImportRow {
    row_number: number
    data: Record<string, any>
}

export interface TaskImportPreviewResponse {
    total_rows: number
    rows: TaskImportRow[]
}

export interface TaskImportValidationError {
    row_number: number
    errors: string[]
}

export interface TaskImportValidationResponse {
    total_rows: number
    valid_rows: number
    invalid_rows: number
    errors: TaskImportValidationError[]
}

export interface TaskImportCommitRow {
    row_number: number
    data: Record<string, any>
}

export interface TaskImportCommitResponse {
    total_rows: number
    created: number
    failed: number
    failed_rows: number[]
}

// ============= Import APIs =============

export async function previewTaskImport(file: File): Promise<TaskImportPreviewResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await api.post('/tasks/import/preview', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    })
    return data
}

export async function validateTaskImport(rows: Record<string, any>[]): Promise<TaskImportValidationResponse> {
    const { data } = await api.post('/tasks/import/validate', rows)
    return data
}

export async function commitTaskImport(rows: TaskImportCommitRow[]): Promise<TaskImportCommitResponse> {
    const { data } = await api.post('/tasks/import/commit', rows)
    return data
}
