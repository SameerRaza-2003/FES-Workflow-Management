import { api } from './api'

export interface Designer {
    id: string
    email: string
    full_name: string
    role: string
}

export interface User {
    id: string
    email: string
    full_name: string
    role: string
}

export async function getDesigners(): Promise<Designer[]> {
    const { data } = await api.get('/users/designers')
    return data
}

export async function getAllUsers(): Promise<User[]> {
    const { data } = await api.get('/users/all')
    return data
}
