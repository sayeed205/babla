import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthGuard } from '../auth-guard'

// Mock the router module
vi.mock('@tanstack/react-router', () => ({
  useRouter: vi.fn(() => ({
    navigate: vi.fn(),
  })),
}))

// Mock the auth store module
vi.mock('../../stores/auth-store', () => ({
  useAuthStore: vi.fn(),
}))

// Import the mocked modules
import { useRouter } from '@tanstack/react-router'
import { useAuthStore } from '../../stores/auth-store'

const mockUseRouter = vi.mocked(useRouter)
const mockUseAuthStore = vi.mocked(useAuthStore)

describe('AuthGuard', () => {
  const mockNavigate = vi.fn()
  const mockInitializeAuth = vi.fn()
  const mockCheckTokenExpiration = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseRouter.mockReturnValue({
      navigate: mockNavigate,
    } as any)

    mockUseAuthStore.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkTokenExpiration: mockCheckTokenExpiration,
      initializeAuth: mockInitializeAuth,
    })
  })

  it('should show loading state when isLoading is true', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      checkTokenExpiration: mockCheckTokenExpiration,
      initializeAuth: mockInitializeAuth,
    })

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    // Check for loading spinner
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should redirect to login when not authenticated', () => {
    mockCheckTokenExpiration.mockReturnValue(false)

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/auth/login' })
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should render children when authenticated and token is valid', () => {
    mockUseAuthStore.mockReturnValue({
      user: { id: 1, firstName: 'Test' },
      token: 'valid-token',
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkTokenExpiration: mockCheckTokenExpiration,
      initializeAuth: mockInitializeAuth,
    })
    mockCheckTokenExpiration.mockReturnValue(false) // Token not expired

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('should initialize auth on mount', () => {
    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    )

    expect(mockInitializeAuth).toHaveBeenCalledTimes(1)
  })
})
