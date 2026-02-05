import { api } from './api'

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface RegisterData {
  full_name: string
  email: string
  password: string
  role: string
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post('/auth/login', { email, password })
  return data
}

export async function register(userData: RegisterData): Promise<void> {
  await api.post('/auth/register', userData)
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function setStoredToken(token: string): void {
  localStorage.setItem('access_token', token)
}

export function clearStoredToken(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('user')
}

export function isAuthenticated(): boolean {
  return !!getStoredToken()
}
