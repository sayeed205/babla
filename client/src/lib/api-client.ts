import type { AxiosInstance, AxiosResponse } from 'axios'
import axios, { AxiosError } from 'axios'
import type { AuthResponse } from '@/features/auth/types/auth-types.ts'

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
    // Get token from localStorage using the same key as auth store
    const savedToken = localStorage.getItem('babla-auth-store')
    const { state } = JSON.parse(savedToken ?? '{}') as unknown as { state: AuthResponse }
    if (state.token) {
      const { token, expiresAt } = state.token
      try {
        if (token) {
          // Check if token is not expired (null expiresAt means eternal token)
          const isExpired =
            expiresAt !== null && expiresAt !== undefined && new Date(expiresAt) <= new Date()

          if (!isExpired) {
            config.headers.Authorization = `Bearer ${token}`
          } else {
            // Token is expired, remove from storage
            // TODO)) add set
          }
        }
      } catch (error) {
        // Invalid stored auth data, remove it
        console.warn('Invalid auth data in localStorage, removing...')
      }
    } else {
      console.log('No auth data found in localStorage for request:', config.url)
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
      // Clear auth data from localStorage using the correct key
      localStorage.removeItem('auth_data')

      // Trigger auth store logout if available
      // Note: We avoid direct import to prevent circular dependencies
      // The auth store will handle its own cleanup via localStorage changes

      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
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

  // Feature-specific API clients
  auth: {
    start: () => apiClient.get('/auth/start'),
    poll: (sessionId: string) => apiClient.get(`/auth/poll/${sessionId}`),
    me: () => apiClient.get('/auth/me'),
  },
  // Future feature APIs will be added here:
  // collections: collectionsApi,
  // movies: moviesApi,
}

// Export the raw axios instance for advanced usage
export { apiClient }

// Export default
export default api
