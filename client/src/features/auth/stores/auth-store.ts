import { create } from 'zustand'
import type { AuthResponse, AuthState, StoredAuth } from '../types/auth-types'

const STORAGE_KEY = 'auth-data'

/**
 * Utility functions for localStorage operations
 */
const storage = {
  get: (): StoredAuth | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Failed to parse stored auth data:', error)
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  },

  set: (data: StoredAuth): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to store auth data:', error)
    }
  },

  remove: (): void => {
    localStorage.removeItem(STORAGE_KEY)
  },
}

/**
 * Check if a token is expired based on its expiration date
 */
const isTokenExpired = (expiresAt: string): boolean => {
  try {
    const expirationTime = new Date(expiresAt).getTime()
    const currentTime = Date.now()
    return currentTime >= expirationTime
  } catch (error) {
    console.error('Invalid expiration date format:', error)
    return true // Treat invalid dates as expired
  }
}

/**
 * Zustand auth store with token persistence and management
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  /**
   * Login action - stores auth data and updates state
   * Requirements: 2.1, 2.2
   */
  login: (authData: AuthResponse) => {
    const { user, token } = authData

    // Store in localStorage for persistence
    const storedAuth: StoredAuth = {
      token: token.token,
      expiresAt: token.expiresAt,
      user,
    }
    storage.set(storedAuth)

    // Update Zustand state
    set({
      user,
      token: token.token,
      isAuthenticated: true,
      isLoading: false,
    })
  },

  /**
   * Logout action - clears all auth data
   * Requirements: 5.1, 5.2
   */
  logout: () => {
    // Clear localStorage
    storage.remove()

    // Clear Zustand state
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  },

  /**
   * Check if current token is expired
   * Requirements: 2.3, 2.4
   */
  checkTokenExpiration: (): boolean => {
    const storedAuth = storage.get()

    if (!storedAuth) {
      return true // No token means expired
    }

    const expired = isTokenExpired(storedAuth.expiresAt)

    if (expired) {
      // Auto-logout if token is expired
      get().logout()
    }

    return expired
  },

  /**
   * Initialize auth state from localStorage on app startup
   * Requirements: 2.2, 2.3, 2.4, 2.5
   */
  initializeAuth: () => {
    set({ isLoading: true })

    const storedAuth = storage.get()

    if (!storedAuth) {
      // No stored auth data
      set({ isLoading: false })
      return
    }

    // Check if token is expired
    if (isTokenExpired(storedAuth.expiresAt)) {
      // Token expired, clear storage and state
      storage.remove()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      })
      return
    }

    // Token is valid, restore auth state
    set({
      user: storedAuth.user,
      token: storedAuth.token,
      isAuthenticated: true,
      isLoading: false,
    })
  },
}))

/**
 * Selector hooks for common auth state access patterns
 */
export const useAuth = () => {
  const store = useAuthStore()
  return {
    user: store.user,
    token: store.token,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login: store.login,
    logout: store.logout,
    checkTokenExpiration: store.checkTokenExpiration,
    initializeAuth: store.initializeAuth,
  }
}

/**
 * Selector for just the authentication status
 */
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)

/**
 * Selector for just the current user
 */
export const useCurrentUser = () => useAuthStore((state) => state.user)

/**
 * Selector for just the auth token
 */
export const useAuthToken = () => useAuthStore((state) => state.token)
