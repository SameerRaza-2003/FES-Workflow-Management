import { api } from './api'

export interface UploadResponse {
    url: string
    public_id: string
}

export async function uploadImage(file: File): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const { data } = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
}
