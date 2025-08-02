import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { authApi } from '../lib/auth-api'
import type { AuthSession } from '../types/auth-types'

interface LoginFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

/**
 * Login form component with Telegram authentication flow
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError }) => {
  const { login, isLoading: authLoading } = useAuth()

  // Component state
  const [isStarting, setIsStarting] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authSession, setAuthSession] = useState<AuthSession | null>(null)
  const [pollCount, setPollCount] = useState(0)

  // Derived loading state
  const isLoading = authLoading || isStarting || isPolling

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  /**
   * Handle authentication errors
   * Requirement: 1.5, 7.4, 7.5
   */
  const handleError = useCallback(
    (errorMessage: string) => {
      setError(errorMessage)
      setIsStarting(false)
      setIsPolling(false)
      setAuthSession(null)
      setPollCount(0)
      onError?.(errorMessage)
    },
    [onError]
  )

  /**
   * Start Telegram authentication flow
   * Requirements: 1.1, 1.2, 1.3
   */
  const startAuthentication = useCallback(async () => {
    try {
      clearError()
      setIsStarting(true)

      // Call start endpoint to get auth URL and session
      const session = await authApi.start()
      setAuthSession(session)

      // Redirect to Telegram OAuth
      // Requirement: 1.2 - WHEN a user clicks the Telegram login widget THEN the system SHALL redirect to Telegram OAuth
      window.location.href = session.authUrl
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start authentication'
      handleError(`Authentication failed: ${errorMessage}`)
    }
  }, [clearError, handleError])

  /**
   * Poll for authentication completion
   * Requirements: 1.3, 1.4
   */
  const pollAuthentication = useCallback(
    async (sessionId: string) => {
      const MAX_POLL_ATTEMPTS = 60 // 5 minutes with 5-second intervals
      const POLL_INTERVAL = 5000 // 5 seconds

      try {
        setIsPolling(true)
        setPollCount(0)

        const poll = async (attempt: number): Promise<void> => {
          if (attempt >= MAX_POLL_ATTEMPTS) {
            throw new Error('Authentication timeout. Please try again.')
          }

          setPollCount(attempt + 1)

          try {
            // Requirement: 1.3 - WHEN a user completes Telegram authentication THEN the system SHALL poll the backend for authentication status
            const authResponse = await authApi.poll(sessionId)

            // Requirement: 1.4 - WHEN authentication is successful THEN the system SHALL store the user token and redirect to the dashboard
            login(authResponse)

            setIsPolling(false)
            setAuthSession(null)
            setPollCount(0)
            onSuccess?.()
          } catch (pollError: any) {
            // Check if it's a 202 (continue polling) or actual error
            if (pollError.response?.status === 202) {
              // Continue polling after delay
              setTimeout(() => poll(attempt + 1), POLL_INTERVAL)
            } else {
              // Actual error occurred
              throw pollError
            }
          }
        }

        await poll(0)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication polling failed'
        handleError(errorMessage)
      }
    },
    [login, handleError, onSuccess]
  )

  /**
   * Handle retry authentication
   */
  const retryAuthentication = useCallback(() => {
    clearError()
    setAuthSession(null)
    setPollCount(0)
    startAuthentication()
  }, [clearError, startAuthentication])

  /**
   * Check for returning from Telegram OAuth and start polling
   * This handles the case where user returns from Telegram
   */
  useEffect(() => {
    // Check if we have a session and should start polling
    if (authSession && !isPolling && !isStarting) {
      pollAuthentication(authSession.session)
    }
  }, [authSession, isPolling, isStarting, pollAuthentication])

  /**
   * Check URL parameters for session ID (if redirected back from Telegram)
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session')

    if (sessionId && !authSession && !isPolling) {
      // We were redirected back from Telegram with a session ID
      setAuthSession({
        session: sessionId,
        authUrl: '',
        expires: '',
      })
    }
  }, [authSession, isPolling])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in with your Telegram account to continue</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Error Display - Requirement: 1.5, 7.4, 7.5 */}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {error}
              <Button
                variant="link"
                size="sm"
                onClick={retryAuthentication}
                className="mt-2 p-0 h-auto"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading States - Requirements: 7.1, 7.2, 7.3 */}
        {isStarting && (
          <Alert>
            <Spinner size="sm" />
            <AlertTitle>Starting Authentication</AlertTitle>
            <AlertDescription>Preparing Telegram login...</AlertDescription>
          </Alert>
        )}

        {isPolling && (
          <Alert>
            <Spinner size="sm" />
            <AlertTitle>Waiting for Authentication</AlertTitle>
            <AlertDescription>
              Please complete the authentication in Telegram.
              {pollCount > 0 && (
                <span className="block text-xs mt-1 opacity-70">Checking... ({pollCount}/60)</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Login Button - Requirements: 1.1, 1.2 */}
        {!isLoading && !authSession && (
          <div className="space-y-4">
            <Button onClick={startAuthentication} className="w-full" size="lg">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.896 6.728-1.268 8.368-1.268 8.368-.159.708-.534.708-.534.708s-2.697-.534-3.761-1.011c-.534-.239-2.697-1.268-3.761-1.507-.534-.159-.896-.477-.896-.896 0-.419.362-.737.896-.896 1.064-.318 2.697-.896 3.761-1.268.534-.186 1.268-.534 1.268-1.268 0-.534-.534-.896-1.268-.896-1.064 0-2.697.534-3.761.896-.534.186-1.268.534-1.268 1.268 0 .534.534.896 1.268.896 1.064 0 2.697-.534 3.761-.896.534-.186 1.268-.534 1.268-1.268 0-.534-.534-.896-1.268-.896z" />
              </svg>
              Continue with Telegram
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Telegram to complete authentication
            </p>
          </div>
        )}

        {/* Polling State Actions */}
        {isPolling && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsPolling(false)
                setAuthSession(null)
                setPollCount(0)
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default LoginForm
