import { create } from 'zustand'
import { storage, tokenUtils } from '../lib/auth-utils'
import type { AuthResponse, AuthState, StoredAuth } from '../types/auth-types'

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

    const expired = tokenUtils.isExpired(storedAuth.expiresAt)

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
    if (tokenUtils.isExpired(storedAuth.expiresAt)) {
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
