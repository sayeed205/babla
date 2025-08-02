import { useAuthStore } from '@/features/auth/stores/auth-store'
import { createFileRoute, redirect, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { LoginForm } from '../features/auth/components/login-form'
import { useAuth } from '../features/auth/hooks/use-auth'

export const Route = createFileRoute('/login')({
    component: LoginPage,
    validateSearch: (search: Record<string, unknown>) => {
        return {
            authSession: (search.authSession as string) || undefined,
        }
    },
    beforeLoad: () => {
        // Check if user is already authenticated
        // This is a basic check - the component will handle more detailed auth state
        const state = useAuthStore.getState()

        if (state.isAuthenticated && !state.isLoading) {
            // User is already authenticated, redirect to dashboard
            throw redirect({
                to: '/dashboard',
                replace: true,
            })
        }
    },
})

/**
 * Login page component
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
function LoginPage() {
    const { isAuthenticated, isLoading } = useAuth()
    const { authSession } = useSearch({ from: '/login' })

    /**
     * Handle successful login
     * Requirement: 1.4 - WHEN authentication is successful THEN the system SHALL store the user token and redirect to the dashboard
     */
    const handleLoginSuccess = () => {
        // Navigation will be handled by the auth state change
        // The redirect logic is in the useEffect below
    }

    /**
     * Handle login errors
     * Requirement: 1.5 - WHEN authentication fails THEN the system SHALL display an appropriate error message
     */
    const handleLoginError = (error: string) => {
        console.error('Login error:', error)
        // Error display is handled by the LoginForm component
    }

    /**
     * Redirect authenticated users to dashboard
     * This handles the case where authentication completes after component mount
     */
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            // Use window.location for immediate redirect since TanStack Router
            // navigation might not work during auth state transitions
            window.location.href = '/dashboard'
        }
    }, [isAuthenticated, isLoading])

    // Show loading state while auth is initializing
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    // If user is authenticated, show loading while redirecting
    if (isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Redirecting to dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Sign in to your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Use your Telegram account to access the application
                    </p>
                </div>

                <LoginForm
                    onSuccess={handleLoginSuccess}
                    onError={handleLoginError}
                    initialSessionId={authSession}
                />

                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        By signing in, you agree to our terms of service and privacy policy.
                    </p>
                </div>
            </div>
        </div>
    )
}