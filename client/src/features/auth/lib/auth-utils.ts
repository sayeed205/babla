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
  isExpired: (expiresAt: Date | string | null): boolean => {
    // If expiration is null, token is valid for eternity
    if (expiresAt === null || expiresAt === undefined) {
      return false
    }

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
