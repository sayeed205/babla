import { Navigate, useLocation } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'

import useAuth from '@/hooks/use-auth.ts'

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * Auth Guard component for protecting routes
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Give some time for auth check to complete
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Show loading state while initializing auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated && pathname === '/login') {
    return <Navigate to="/dashboard" />
  }

  if (!isAuthenticated && pathname === '/login') return children

  if (!isAuthenticated) {
    return <Navigate to="/login" replace search={{ authSession: undefined }} />
  }

  return children
}

export default AuthGuard
