import { apiClient } from '@/lib/api-client.ts'

import type { AuthResponse, AuthSession, User } from '../types/auth-types'

/**
 * Auth-specific API client that integrates with the base axios instance
 * Implements start, poll, and me endpoints for Telegram authentication flow
 * Requirements: 1.3, 4.1, 6.1, 6.5
 */
export const authApi = {
  /**
   * Start authentication flow - initiates Telegram OAuth
   * Returns auth URL and session ID for polling
   * Requirement: 1.3 - WHEN a user clicks the Telegram login widget THEN the system SHALL redirect to Telegram OAuth
   */
  start: async (source: 'web' | 'app' = 'web'): Promise<AuthSession> => {
    const response = await apiClient.get<AuthSession>(`/auth/start?source=${source}`)
    return response.data
  },

  /**
   * Poll authentication status - checks if user has completed Telegram OAuth
   * Returns user data and token when authentication is complete
   * Requirement: 1.3 - WHEN a user completes Telegram authentication THEN the system SHALL poll the backend for authentication status
   */
  poll: async (sessionId: string): Promise<AuthResponse> => {
    const response = await apiClient.get<AuthResponse>(`/auth/poll/${sessionId}`)
    return response.data
  },

  /**
   * Get current user information - fetches authenticated user data
   * Requires valid authentication token in headers (handled by axios interceptor)
   * Requirement: 4.1 - WHEN an authenticated user accesses their profile THEN the system SHALL display user information from the /api/auth/me endpoint
   */
  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  },

  logout: async () => {
    const response = await apiClient.get<AuthResponse>('/auth/logout')
    return response.data
  },
}

// Export default for convenience
export default authApi
