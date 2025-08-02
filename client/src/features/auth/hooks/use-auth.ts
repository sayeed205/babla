/**
 * useAuth hook - Convenient interface to auth store and utilities
 * Requirements: 2.3, 2.4, 6.6
 */

import { useCallback, useEffect } from 'react'
import { authHelpers, authValidation, tokenUtils } from '../lib/auth-utils'
import { useAuthStore } from '../stores/auth-store'
import type { AuthResponse } from '../types/auth-types'

/**
 * Custom hook that provides auth state and actions
 * Requirements: 2.3, 2.4, 6.6
 */
export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkTokenExpiration,
    initializeAuth,
  } = useAuthStore()

  /**
   * Enhanced login with validation
   * Requirements: 2.1, 2.2
   */
  const handleLogin = useCallback(
    (authData: AuthResponse) => {
      // Validate auth data before storing
      if (!authData.user || !authData.token) {
        throw new Error('Invalid auth data: missing user or token')
      }

      if (!authValidation.isValidUser(authData.user)) {
        throw new Error('Invalid user data')
      }

      if (!tokenUtils.isValidFormat(authData.token.token)) {
        throw new Error('Invalid token format')
      }

      if (tokenUtils.isExpired(authData.token.expiresAt)) {
        throw new Error('Token is already expired')
      }

      login(authData)
    },
    [login]
  )

  /**
   * Enhanced logout with cleanup
   * Requirements: 5.1, 5.2
   */
  const handleLogout = useCallback(() => {
    logout()
  }, [logout])

  /**
   * Check if current session is valid
   * Requirements: 2.3, 2.4
   */
  const isSessionValid = useCallback((): boolean => {
    if (!isAuthenticated || !token) {
      return false
    }

    // This will also trigger auto-logout if expired
    return !checkTokenExpiration()
  }, [isAuthenticated, token, checkTokenExpiration])

  /**
   * Get formatted user display name
   */
  const userDisplayName = useCallback((): string => {
    if (!user) {
      return ''
    }

    return authHelpers.formatUserDisplayName(user)
  }, [user])

  /**
   * Get time until token expires (in milliseconds)
   */
  const getTimeUntilExpiry = useCallback((): number | null => {
    if (!isAuthenticated || !token) {
      return null
    }

    const storedAuth = useAuthStore.getState()
    if (!storedAuth) {
      return null
    }

    // We need to get the expiration date from storage since it's not in the store
    const storage = require('../lib/auth-utils').storage
    const stored = storage.get()

    if (!stored) {
      return null
    }

    return tokenUtils.getTimeUntilExpiry(stored.expiresAt)
  }, [isAuthenticated, token])

  /**
   * Check if user has specific permissions (placeholder for future use)
   */
  const hasPermission = useCallback(
    (_permission: string): boolean => {
      // Placeholder - in a real app, you might check user roles/permissions
      return isAuthenticated
    },
    [isAuthenticated]
  )

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    // Call async initialization
    initializeAuth().catch(console.error)
  }, [initializeAuth])

  /**
   * Set up token expiration monitoring
   * Requirements: 2.3, 2.4
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    // Check token expiration every minute
    const interval = setInterval(() => {
      checkTokenExpiration()
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated, checkTokenExpiration])

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoading,

    // Actions
    login: handleLogin,
    logout: handleLogout,

    // Utilities
    isSessionValid,
    userDisplayName,
    getTimeUntilExpiry,
    hasPermission,

    // Token utilities (exposed for advanced use cases)
    tokenUtils: {
      isExpired: tokenUtils.isExpired,
      isValidFormat: tokenUtils.isValidFormat,
      getTimeUntilExpiry: tokenUtils.getTimeUntilExpiry,
    },
  }
}

/**
 * Hook for components that require authentication
 * Throws error if user is not authenticated
 * Requirements: 3.1, 3.2
 */
export const useRequireAuth = () => {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      throw new Error('Authentication required')
    }
  }, [auth.isAuthenticated, auth.isLoading])

  return auth
}

/**
 * Hook that provides auth status without triggering initialization
 * Useful for components that need to check auth state without side effects
 */
export const useAuthStatus = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore()

  return {
    isAuthenticated,
    isLoading,
    user,
  }
}
