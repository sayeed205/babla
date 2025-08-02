import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthResponse } from '../../types/auth-types'
import { useAuthStore } from '../auth-store'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Mock localStorage globally for Node.js environment
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

describe('AuthStore', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Reset store state
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    })
  })

  describe('login', () => {
    it('should store auth data and update state', () => {
      const mockAuthData: AuthResponse = {
        user: {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
        },
        token: {
          token: 'test-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          type: 'bearer',
        },
      }

      const { login } = useAuthStore.getState()
      login(mockAuthData)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockAuthData.user)
      expect(state.token).toBe(mockAuthData.token.token)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)

      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth-data',
        JSON.stringify({
          token: mockAuthData.token.token,
          expiresAt: mockAuthData.token.expiresAt,
          user: mockAuthData.user,
        })
      )
    })
  })

  describe('logout', () => {
    it('should clear auth data and state', () => {
      // First login
      const mockAuthData: AuthResponse = {
        user: { id: 1, firstName: 'John' },
        token: {
          token: 'test-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          type: 'bearer',
        },
      }

      const { login, logout } = useAuthStore.getState()
      login(mockAuthData)

      // Then logout
      logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)

      // Verify localStorage was cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-data')
    })
  })

  describe('checkTokenExpiration', () => {
    it('should return true and logout if token is expired', () => {
      const expiredDate = new Date(Date.now() - 3600000).toISOString() // 1 hour ago

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          token: 'expired-token',
          expiresAt: expiredDate,
          user: { id: 1, firstName: 'John' },
        })
      )

      const { checkTokenExpiration } = useAuthStore.getState()
      const isExpired = checkTokenExpiration()

      expect(isExpired).toBe(true)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-data')
    })

    it('should return false if token is valid', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString() // 1 hour from now

      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({
          token: 'valid-token',
          expiresAt: futureDate,
          user: { id: 1, firstName: 'John' },
        })
      )

      const { checkTokenExpiration } = useAuthStore.getState()
      const isExpired = checkTokenExpiration()

      expect(isExpired).toBe(false)
      expect(localStorageMock.removeItem).not.toHaveBeenCalled()
    })
  })

  describe('initializeAuth', () => {
    it('should restore auth state from valid stored data', () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString()
      const storedData = {
        token: 'stored-token',
        expiresAt: futureDate,
        user: { id: 1, firstName: 'John' },
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      const { initializeAuth } = useAuthStore.getState()
      initializeAuth()

      const state = useAuthStore.getState()
      expect(state.user).toEqual(storedData.user)
      expect(state.token).toBe(storedData.token)
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('should clear state if stored token is expired', () => {
      const expiredDate = new Date(Date.now() - 3600000).toISOString()
      const storedData = {
        token: 'expired-token',
        expiresAt: expiredDate,
        user: { id: 1, firstName: 'John' },
      }

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData))

      const { initializeAuth } = useAuthStore.getState()
      initializeAuth()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-data')
    })

    it('should handle no stored data', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const { initializeAuth } = useAuthStore.getState()
      initializeAuth()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(state.isLoading).toBe(false)
    })
  })
})
