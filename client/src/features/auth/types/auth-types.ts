/**
 * Auth-related TypeScript interfaces for the frontend authentication system
 */

export interface User {
  id: number
  firstName: string
  lastName?: string
  username?: string
  avatar?: string
}

export interface AuthToken {
  token: string
  expiresAt: string
  type: 'bearer'
}

export interface AuthResponse {
  user: User
  token: AuthToken
}

export interface AuthSession {
  authUrl: string
  session: string
  expires: string
}

/**
 * Local storage schema for persisted auth data
 */
export interface StoredAuth {
  token: string
  expiresAt: string
  user: User
}

/**
 * Auth state interface for Zustand store
 */
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (authData: AuthResponse) => void
  logout: () => void
  checkTokenExpiration: () => boolean
  initializeAuth: () => void
}
