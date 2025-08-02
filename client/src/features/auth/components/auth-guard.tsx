import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuthStore } from '../stores/auth-store'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Auth Guard component for protecting routes
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export function AuthGuard({ children, redirectTo = '/auth/login' }: AuthGuardProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, checkTokenExpiration, initializeAuth } = useAuthStore()

  useEffect(() => {
    // Initialize auth state on component mount
    initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    // Skip checks if still loading
    if (isLoading) {
      return
    }

    // Check token expiration
    const isExpired = checkTokenExpiration()

    // If not authenticated or token expired, redirect to login
    if (!isAuthenticated || isExpired) {
      router.navigate({ to: redirectTo })
      return
    }
  }, [isAuthenticated, isLoading, checkTokenExpiration, router, redirectTo])

  // Show loading state while initializing auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default AuthGuard
