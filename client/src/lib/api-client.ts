import axios, { AxiosError } from 'axios'

import type { AxiosInstance, AxiosResponse } from 'axios'

// Base API configuration
const API_BASE_URL = '/api' // Uses Vite proxy configuration

// Create base axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for adding auth tokens
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage if available
    const storedAuth = localStorage.getItem('auth')
    if (storedAuth) {
      try {
        const { token, expiresAt } = JSON.parse(storedAuth)

        // Check if token is not expired
        if (token && new Date(expiresAt) > new Date()) {
          config.headers.Authorization = `Bearer ${token}`
        } else {
          // Token is expired, remove from storage
          localStorage.removeItem('auth')
        }
      } catch (error) {
        // Invalid stored auth data, remove it
        localStorage.removeItem('auth')
        console.warn('Invalid auth data in localStorage, removing...')
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized responses
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('auth')

      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login'
      }
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message)
      // You could show a toast notification here
    }

    // Handle other HTTP errors
    if (error.response) {
      console.error(`API Error ${error.response.status}:`, error.response.data)
    }

    return Promise.reject(error)
  }
)

// Base API client structure for future feature integration
export const api = {
  // Generic methods for direct axios usage
  get: <T = any>(url: string, config?: any) => apiClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: any) => apiClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: any) => apiClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: any) => apiClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: any) => apiClient.delete<T>(url, config),

  // Feature-specific API clients will be added here
  // Example structure for future features:
  // auth: authApi,
  // collections: collectionsApi,
  // movies: moviesApi,
}

// Export the raw axios instance for advanced usage
export { apiClient }

// Export default
export default api
