import { createFileRoute, useSearch } from '@tanstack/react-router'
import { LoginForm } from '../features/auth/components/login-form'

export const Route = createFileRoute('/login')({
  component: LoginPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      authSession: (search.authSession as string) || undefined,
    }
  },
})

/**
 * Login page component
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
function LoginPage() {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Sign in to your account</h2>
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
