/**
 * Auth-related TypeScript interfaces for the frontend authentication system
 */

export interface User {
  id: string
  firstName: string
  lastName?: string | null
  username?: string | null
  avatar?: string
}

export interface AuthToken {
  abilities: string[]
  expiresAt: string | Date | null
  lastUsedAt: string | Date | null
  name: null | string
  token: string
  type: string
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

export interface AuthState {
  user: User | null
  token: AuthToken | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface AuthActions {
  login: (authData: AuthResponse) => void
  logout: () => Promise<void>
  initializeAuth: () => void
}

export type AuthStore = AuthActions & AuthState
