/**
 * Authentication error handler for media player
 * Handles authentication errors with proper user feedback and recovery
 */

import { toast } from 'sonner'
import type { AuthenticationError, MediaPlayerErrorType } from '../types/error-types'

export interface AuthErrorHandlerConfig {
  redirectToLogin: boolean
  showToast: boolean
  autoRetry: boolean
  retryDelay: number
}

export const DEFAULT_AUTH_ERROR_CONFIG: AuthErrorHandlerConfig = {
  redirectToLogin: true,
  showToast: true,
  autoRetry: false,
  retryDelay: 2000,
}

/**
 * Handle authentication errors in media player
 */
export class AuthErrorHandler {
  private config: AuthErrorHandlerConfig

  constructor(config: Partial<AuthErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_AUTH_ERROR_CONFIG, ...config }
  }

  /**
   * Handle authentication error
   */
  async handleAuthError(
    error: AuthenticationError,
    context?: {
      mediaId?: string
      mediaType?: string
      operation?: string
    }
  ): Promise<void> {
    // Show user-friendly toast notification
    if (this.config.showToast) {
      this.showAuthErrorToast(error)
    }

    // Handle different types of auth errors
    if (error.requiresLogin) {
      await this.handleLoginRequired(error, context)
    } else if (error.tokenExpired) {
      await this.handleTokenExpired(error, context)
    } else {
      await this.handleGenericAuthError()
    }
  }

  /**
   * Handle login required error
   */
  private async handleLoginRequired(_error: AuthenticationError, context?: any): Promise<void> {
    if (this.config.redirectToLogin) {
      // Store current location for redirect after login
      const currentPath = window.location.pathname + window.location.search
      sessionStorage.setItem('media-player-redirect', currentPath)

      // Store media context for resuming playback
      if (context?.mediaId && context?.mediaType) {
        sessionStorage.setItem(
          'media-player-resume',
          JSON.stringify({
            mediaId: context.mediaId,
            mediaType: context.mediaType,
            timestamp: Date.now(),
          })
        )
      }

      // Redirect to login
      window.location.href = '/login'
    }
  }

  /**
   * Handle token expired error
   */
  private async handleTokenExpired(error: AuthenticationError, context?: any): Promise<void> {
    try {
      // Try to refresh the token
      const refreshResult = await this.attemptTokenRefresh()

      if (refreshResult.success) {
        // Token refreshed successfully, show success message
        if (this.config.showToast) {
          toast.success('Session refreshed successfully')
        }

        // Auto-retry the original operation if configured
        if (this.config.autoRetry && context?.operation) {
          setTimeout(() => {
            // This would trigger a retry of the original operation
            window.dispatchEvent(
              new CustomEvent('media-player-retry', {
                detail: context,
              })
            )
          }, this.config.retryDelay)
        }
      } else {
        // Token refresh failed, treat as login required
        await this.handleLoginRequired(error, context)
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError)
      await this.handleLoginRequired(error, context)
    }
  }

  /**
   * Handle generic authentication error
   */
  private async handleGenericAuthError(): Promise<void> {
    // For generic auth errors, show error and suggest page refresh
    if (this.config.showToast) {
      toast.error('Authentication error occurred', {
        description: 'Please refresh the page and try again',
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      })
    }
  }

  /**
   * Show appropriate toast notification for auth error
   */
  private showAuthErrorToast(error: AuthenticationError): void {
    if (error.requiresLogin) {
      toast.error('Login Required', {
        description: 'Please log in to continue watching',
        action: {
          label: 'Log In',
          onClick: () => (window.location.href = '/login'),
        },
      })
    } else if (error.tokenExpired) {
      toast.warning('Session Expired', {
        description: 'Your session has expired. Refreshing...',
      })
    } else {
      toast.error('Authentication Error', {
        description: error.message,
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload(),
        },
      })
    }
  }

  /**
   * Attempt to refresh authentication token
   */
  private async attemptTokenRefresh(): Promise<{ success: boolean; error?: string }> {
    try {
      // This would integrate with your auth system
      // For now, we'll simulate a token refresh attempt
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        return { success: true }
      } else {
        return {
          success: false,
          error: `Token refresh failed with status ${response.status}`,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check if user should be redirected after successful login
   */
  static checkForPostLoginRedirect(): void {
    const redirectPath = sessionStorage.getItem('media-player-redirect')
    const resumeData = sessionStorage.getItem('media-player-resume')

    if (redirectPath) {
      sessionStorage.removeItem('media-player-redirect')

      // If there's resume data, set up auto-resume
      if (resumeData) {
        try {
          const resume = JSON.parse(resumeData)
          sessionStorage.removeItem('media-player-resume')

          // Check if resume data is still valid (within 30 minutes)
          const thirtyMinutes = 30 * 60 * 1000
          if (Date.now() - resume.timestamp < thirtyMinutes) {
            // Dispatch event to resume playback
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent('media-player-auto-resume', {
                  detail: resume,
                })
              )
            }, 1000)
          }
        } catch (error) {
          console.error('Failed to parse resume data:', error)
          sessionStorage.removeItem('media-player-resume')
        }
      }

      // Navigate to the original path
      if (redirectPath !== window.location.pathname + window.location.search) {
        window.location.href = redirectPath
      }
    }
  }
}

/**
 * Hook for using auth error handler in React components
 */
export function useAuthErrorHandler(config?: Partial<AuthErrorHandlerConfig>) {
  const handler = new AuthErrorHandler(config)

  return {
    handleAuthError: handler.handleAuthError.bind(handler),
    checkForPostLoginRedirect: AuthErrorHandler.checkForPostLoginRedirect,
  }
}

/**
 * Utility to check if an error is an authentication error
 */
export function isAuthenticationError(error: MediaPlayerErrorType): error is AuthenticationError {
  return error.category === 'authentication'
}

/**
 * Create user-friendly auth error message
 */
export function formatAuthErrorMessage(error: AuthenticationError): string {
  if (error.requiresLogin) {
    return 'Please log in to continue watching this content.'
  }

  if (error.tokenExpired) {
    return 'Your session has expired. Please refresh the page or log in again.'
  }

  return 'Authentication failed. Please check your login status and try again.'
}

/**
 * Get appropriate action for auth error
 */
export function getAuthErrorAction(error: AuthenticationError): {
  label: string
  action: () => void
} {
  if (error.requiresLogin) {
    return {
      label: 'Log In',
      action: () => (window.location.href = '/login'),
    }
  }

  return {
    label: 'Refresh',
    action: () => window.location.reload(),
  }
}
