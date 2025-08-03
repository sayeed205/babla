import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { storage, tokenUtils } from '../lib/auth-utils'
import type { AuthResponse, AuthStore } from '../types/auth-types'
import authApi from '@/features/auth/lib/auth-api.ts'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      /**
       * Login action - stores auth data and updates state
       * Requirements: 2.1, 2.2
       */
      login: (authData: AuthResponse) => {
        set({
          ...authData,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      /**
       * Logout action - clears all auth data
       * Requirements: 5.1, 5.2
       */
      logout: async () => {
        // Clear localStorage
        storage.remove()
        await authApi.logout()
        // TODO)) hit logout api call

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
        const state = get()

        if (!state.token) {
          return true // No token means expired
        }

        const expired = tokenUtils.isExpired(state.token.expiresAt)

        if (expired) {
          // Auto-logout if token is expired
          get().logout()
        }

        return expired
      },

      /**
       * Initialize auth state from localStorage and verify with backend
       * Requirements: 2.2, 2.3, 2.4, 2.5, 4.1
       */
      initializeAuth: async () => {
        set({ isLoading: true })

        const savedToken = localStorage.getItem('babla-auth-store')

        if (!savedToken) {
          set({ isLoading: false })
          return
        }
        const { state } = JSON.parse(savedToken) as unknown as { state: AuthResponse }

        // Check if token is expired
        if (state.token && tokenUtils.isExpired(state.token.expiresAt)) {
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

        // Token exists and is not expired, verify with backend
        try {
          const currentUser = await authApi.me()

          // Token is valid and verified, restore auth state with fresh user data
          set({
            user: currentUser,
            token: state.token,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          console.warn('Failed to verify token with backend:', error)
          // Token might be invalid, clear storage and state
          storage.remove()
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'babla-auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      version: 1,
    }
  )
)
