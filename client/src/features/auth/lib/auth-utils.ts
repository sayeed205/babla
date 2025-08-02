/**
 * Auth utilities for token validation, expiration checks, and localStorage management
 * Requirements: 2.3, 2.4, 6.6
 */

import type { StoredAuth } from '../types/auth-types'

const AUTH_STORAGE_KEY = 'auth_data'

/**
 * Token validation and expiration utilities
 */
export const tokenUtils = {
  /**
   * Check if a token is expired based on expiration date
   * Requirements: 2.3, 2.4
   */
  isExpired: (expiresAt: string): boolean => {
    try {
      const expirationDate = new Date(expiresAt)
      const now = new Date()

      // Add a small buffer (30 seconds) to handle clock skew
      const bufferMs = 30 * 1000
      return now.getTime() + bufferMs >= expirationDate.getTime()
    } catch (error) {
      // If we can't parse the date, consider it expired
      console.warn('Failed to parse token expiration date:', expiresAt)
      return true
    }
  },

  /**
   * Validate token format (basic validation)
   * Requirements: 6.6
   */
  isValidFormat: (token: string): boolean => {
    if (!token || typeof token !== 'string') {
      return false
    }

    // Basic validation - token should be a non-empty string
    // In a real app, you might want more sophisticated validation
    return token.trim().length > 0
  },

  /**
   * Get time until token expires in milliseconds
   * Returns null if token is already expired or invalid
   */
  getTimeUntilExpiry: (expiresAt: string): number | null => {
    try {
      const expirationDate = new Date(expiresAt)
      const now = new Date()
      const timeUntilExpiry = expirationDate.getTime() - now.getTime()

      return timeUntilExpiry > 0 ? timeUntilExpiry : null
    } catch (error) {
      return null
    }
  },
}

/**
 * localStorage management utilities for auth data
 * Requirements: 2.1, 2.2
 */
export const storage = {
  /**
   * Store auth data in localStorage
   * Requirements: 2.1, 2.2
   */
  set: (authData: StoredAuth): void => {
    try {
      const serialized = JSON.stringify(authData)
      localStorage.setItem(AUTH_STORAGE_KEY, serialized)
    } catch (error) {
      console.error('Failed to store auth data:', error)
    }
  },

  /**
   * Retrieve auth data from localStorage
   * Requirements: 2.2
   */
  get: (): StoredAuth | null => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!stored) {
        return null
      }

      const parsed = JSON.parse(stored) as StoredAuth

      // Validate the structure of stored data
      if (!parsed.token || !parsed.expiresAt || !parsed.user) {
        console.warn('Invalid stored auth data structure')
        storage.remove() // Clean up invalid data
        return null
      }

      return parsed
    } catch (error) {
      console.error('Failed to retrieve auth data:', error)
      storage.remove() // Clean up corrupted data
      return null
    }
  },

  /**
   * Remove auth data from localStorage
   * Requirements: 2.4, 5.1
   */
  remove: (): void => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch (error) {
      console.error('Failed to remove auth data:', error)
    }
  },

  /**
   * Check if auth data exists in localStorage
   */
  exists: (): boolean => {
    try {
      return localStorage.getItem(AUTH_STORAGE_KEY) !== null
    } catch (error) {
      return false
    }
  },
}

/**
 * Auth validation utilities
 * Requirements: 2.3, 2.4, 6.6
 */
export const authValidation = {
  /**
   * Validate stored auth data completeness and token expiration
   * Requirements: 2.3, 2.4
   */
  isValidStoredAuth: (storedAuth: StoredAuth | null): boolean => {
    if (!storedAuth) {
      return false
    }

    // Check required fields
    if (!storedAuth.token || !storedAuth.expiresAt || !storedAuth.user) {
      return false
    }

    // Check token format
    if (!tokenUtils.isValidFormat(storedAuth.token)) {
      return false
    }

    // Check if token is expired
    if (tokenUtils.isExpired(storedAuth.expiresAt)) {
      return false
    }

    return true
  },

  /**
   * Validate user object structure
   * Requirements: 6.6
   */
  isValidUser: (user: any): boolean => {
    if (!user || typeof user !== 'object') {
      return false
    }

    // Check required fields
    if (!user.id || !user.firstName) {
      return false
    }

    // Validate types
    if (typeof user.id !== 'number' || typeof user.firstName !== 'string') {
      return false
    }

    return true
  },
}

/**
 * Auth helper utilities
 */
export const authHelpers = {
  /**
   * Create authorization header value from token
   * Requirements: 6.1
   */
  createAuthHeader: (token: string): string => {
    return `Bearer ${token}`
  },

  /**
   * Extract token from authorization header
   */
  extractTokenFromHeader: (authHeader: string): string | null => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    return authHeader.substring(7) // Remove 'Bearer ' prefix
  },

  /**
   * Format user display name
   */
  formatUserDisplayName: (user: {
    firstName: string
    lastName?: string
    username?: string
  }): string => {
    if (user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }

    if (user.username) {
      return `${user.firstName} (@${user.username})`
    }

    return user.firstName
  },
}
