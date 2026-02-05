import { api } from './api'

export type LoginResponse = {
  access_token: string
  token_type: 'bearer'
}

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    email,
    password,
  })

  localStorage.setItem('access_token', data.access_token)
  return data
}
