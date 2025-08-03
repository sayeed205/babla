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
  token: AuthToken
  expiresAt: string
  user: User
}

export interface AuthState {
  user: User | null
  token: AuthToken | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthActions {
  login: (authData: AuthResponse) => void
  logout: () => Promise<void>
  checkTokenExpiration: () => boolean
  initializeAuth: () => void
}

export type AuthStore = AuthActions & AuthState
