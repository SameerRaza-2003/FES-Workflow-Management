import axios from "axios"

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://18.206.81.37:8000"

export const api = axios.create({
  baseURL: API_BASE_URL,
})

/**
 * Automatically attach JWT to every request
 */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Optional: global 401 handling
 */
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Unauthorized — token may be expired')
    }
    return Promise.reject(error)
  }
)