import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import React, { useCallback, useEffect, useState } from 'react'
import { authApi } from '../lib/auth-api'
import type { AuthSession } from '../types/auth-types'
import { useAuthStore } from '@/features/auth/stores/auth-store.ts'

interface LoginFormProps {
  onSuccess?: () => void
  onError?: (error: string) => void
  initialSessionId?: string
}

/**
 * Login form component with Telegram authentication flow
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onError, initialSessionId }) => {
  const { login, isLoading: authLoading } = useAuthStore()

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
   * Poll for authentication completion
   * Requirements: 1.3, 1.4
   */
  const pollAuthentication = useCallback(
    async (sessionId: string) => {
      console.log('pollAuthentication called with sessionId:', sessionId)

      // Check if session has expired based on the expires time from authSession
      const sessionExpires = authSession?.expires
      if (sessionExpires) {
        const expiresTime = new Date(sessionExpires).getTime()
        const currentTime = new Date().getTime()
        if (currentTime > expiresTime) {
          throw new Error('Authentication session has expired. Please try again.')
        }
      }

      const POLL_INTERVAL = 5000 // 5 seconds
      // Calculate max attempts based on expires time or default to 5 minutes
      let maxPollTime = 5 * 60 * 1000 // 5 minutes default
      if (sessionExpires) {
        const expiresTime = new Date(sessionExpires).getTime()
        const currentTime = new Date().getTime()
        maxPollTime = Math.min(expiresTime - currentTime, maxPollTime)
      }
      const MAX_POLL_ATTEMPTS = Math.floor(maxPollTime / POLL_INTERVAL)

      try {
        setIsPolling(true)
        setPollCount(0)
        console.log('Starting polling with max attempts:', MAX_POLL_ATTEMPTS)

        const poll = async (attempt: number): Promise<void> => {
          console.log(`Poll attempt ${attempt + 1}/${MAX_POLL_ATTEMPTS}`)

          if (attempt >= MAX_POLL_ATTEMPTS) {
            throw new Error('Authentication timeout. Please try again.')
          }

          // Check if session has expired during polling
          if (sessionExpires) {
            const expiresTime = new Date(sessionExpires).getTime()
            const currentTime = new Date().getTime()
            if (currentTime > expiresTime) {
              throw new Error('Authentication session has expired. Please try again.')
            }
          }

          setPollCount(attempt + 1)

          try {
            // Requirement: 1.3 - WHEN a user completes Telegram authentication THEN the system SHALL poll the backend for authentication status
            const authResponse = await authApi.poll(sessionId)

            // Check if the response has the expected structure
            if (!authResponse || typeof authResponse !== 'object') {
              console.error('Invalid response format:', authResponse)
              throw new Error('Invalid response format from server')
            }

            if (!authResponse.user || !authResponse.token) {
              console.error('Missing user or token in response:', {
                hasUser: !!authResponse.user,
                hasToken: !!authResponse.token,
                response: authResponse,
              })
              // This might be a 202-like response, continue polling
              setTimeout(() => poll(attempt + 1), POLL_INTERVAL)
              return
            }

            // 200 response with valid user and token - authentication successful!
            // Requirement: 1.4 - WHEN authentication is successful THEN the system SHALL store the user token and redirect to the dashboard
            login(authResponse)

            setIsPolling(false)
            setAuthSession(null)
            setPollCount(0)

            // Clear the URL query parameters since auth is complete
            window.history.replaceState({}, '', '/login')

            onSuccess?.()
          } catch (pollError: any) {
            const status = pollError.response?.status

            if (status === 202) {
              // Continue polling after delay
              setTimeout(() => poll(attempt + 1), POLL_INTERVAL)
            } else if (status === 200) {
              // This shouldn't happen in the catch block, but handle it just in case
              // The response should have been handled in the try block
              return
            } else {
              // Any other status code (400, 401, 403, 404, 410, 500, etc.)
              // Clear the URL query parameters and redirect to clean login page
              window.history.replaceState({}, '', '/login')

              // Actual error occurred
              throw pollError
            }
          }
        }

        await poll(0)
      } catch (err) {
        // Clear the URL query parameters when polling fails
        window.history.replaceState({}, '', '/login')

        const errorMessage = err instanceof Error ? err.message : 'Authentication polling failed'
        handleError(errorMessage)
      }
    },
    [login, handleError, onSuccess, authSession]
  )

  /**
   * Handle retry authentication
   */
  const retryAuthentication = useCallback(() => {
    clearError()
    setAuthSession(null)
    setPollCount(0)
    // Clear URL and let user start fresh
    window.history.replaceState({}, '', '/login')
    window.location.reload()
  }, [clearError])

  /**
   * Handle initial session ID from URL parameter (when redirected back from Telegram)
   */
  useEffect(() => {
    if (initialSessionId && !authSession && !isPolling) {
      // Create a mock session object for polling
      setAuthSession({
        session: initialSessionId,
        authUrl: '',
        expires: '',
      })
      // Start polling immediately
      pollAuthentication(initialSessionId)
    }
  }, [initialSessionId, authSession, isPolling, pollAuthentication])

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

        {/* Login Button - Requirements: 1.1, 1.2 */}
        {!isLoading && !authSession && (
          <div className="space-y-4">
            <Button
              onClick={async () => {
                try {
                  clearError()
                  setIsStarting(true)

                  // Call start endpoint to get auth URL and session
                  const session = await authApi.start('web')
                  console.log('Auth session received:', session)

                  // Redirect directly to Telegram in the same tab
                  window.location.href = session.authUrl
                } catch (err) {
                  const errorMessage =
                    err instanceof Error ? err.message : 'Failed to start authentication'
                  handleError(`Authentication failed: ${errorMessage}`)
                }
              }}
              className="w-full"
              size="lg"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.896 6.728-1.268 8.368-1.268 8.368-.159.708-.534.708-.534.708s-2.697-.534-3.761-1.011c-.534-.239-2.697-1.268-3.761-1.507-.534-.159-.896-.477-.896-.896 0-.419.362-.737.896-.896 1.064-.318 2.697-.896 3.761-1.268.534-.186 1.268-.534 1.268-1.268 0-.534-.534-.896-1.268-.896-1.064 0-2.697.534-3.761.896-.534.186-1.268.534-1.268 1.268 0 .534.534.896 1.268.896 1.064 0 2.697-.534 3.761-.896.534-.186 1.268-.534 1.268-1.268 0-.534-.534-.896-1.268-.896z" />
              </svg>
              Continue with Telegram
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              You'll be redirected to Telegram for authentication
            </p>
          </div>
        )}

        {/* Show polling status when authSession exists */}
        {authSession && isPolling && (
          <Alert>
            <Spinner size="sm" />
            <AlertTitle>Waiting for Authentication</AlertTitle>
            <AlertDescription>
              Please complete the authentication in Telegram. You'll be redirected back
              automatically.
              {pollCount > 0 && (
                <span className="block text-xs mt-1 opacity-70">Checking... ({pollCount}/60)</span>
              )}
            </AlertDescription>
          </Alert>
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
