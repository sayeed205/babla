/**
 * ErrorDisplay Component
 * Displays user-friendly error messages with recovery options
 * Integrates with the enhanced error handling system
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  FileX,
  LogIn,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  Wifi,
} from 'lucide-react'
import { useMediaPlayerStore } from '../stores/media-player-store'
import type { ErrorState } from '../types/error-types'

interface ErrorDisplayProps {
  errorState: ErrorState
  className?: string
  compact?: boolean
}

export function ErrorDisplay({ errorState, className, compact = false }: ErrorDisplayProps) {
  const { retryLastAction, handleRecovery, clearError } = useMediaPlayerStore()

  if (!errorState.hasError || !errorState.error) {
    return null
  }

  const { error, recoveryStrategy, isRecovering, retryCount } = errorState

  const handleRetry = async () => {
    if (recoveryStrategy?.recoveryAction === 'retry') {
      await retryLastAction()
    } else if (recoveryStrategy) {
      await handleRecovery(recoveryStrategy)
    }
  }

  const handleUserAction = () => {
    if (error.category === 'authentication') {
      // Redirect to login or refresh page
      const authError = error as any
      if (authError.requiresLogin) {
        window.location.href = '/login'
      } else {
        window.location.reload()
      }
    } else {
      clearError()
    }
  }

  const getErrorIcon = () => {
    switch (error.category) {
      case 'network':
        return <Wifi className="h-6 w-6" />
      case 'authentication':
        return <LogIn className="h-6 w-6" />
      case 'permission':
        return <Shield className="h-6 w-6" />
      case 'media_format':
        return <FileX className="h-6 w-6" />
      case 'player_library':
        return <Settings className="h-6 w-6" />
      default:
        return <AlertTriangle className="h-6 w-6" />
    }
  }

  const getSeverityColor = () => {
    switch (error.severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      case 'high':
        return 'text-red-500 dark:text-red-400'
      case 'medium':
        return 'text-orange-500 dark:text-orange-400'
      case 'low':
        return 'text-yellow-500 dark:text-yellow-400'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  const getBackgroundColor = () => {
    switch (error.severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
      case 'high':
        return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
      case 'medium':
        return 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800'
      case 'low':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
    }
  }

  const canRetry =
    recoveryStrategy?.canRecover && recoveryStrategy.maxRetries
      ? retryCount < recoveryStrategy.maxRetries
      : true

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-lg border',
          getBackgroundColor(),
          className
        )}
      >
        <div className="flex items-center space-x-3">
          <div className={getSeverityColor()}>{getErrorIcon()}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {recoveryStrategy?.userMessage || error.message}
            </p>
            {error.details && (
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{error.details}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {recoveryStrategy?.canRecover && canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRecovering}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              {isRecovering ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                recoveryStrategy.actionLabel || 'Retry'
              )}
            </Button>
          )}

          {recoveryStrategy?.recoveryAction === 'user_action' && (
            <Button onClick={handleUserAction} size="sm" variant="default" className="text-xs">
              {recoveryStrategy.actionLabel || 'OK'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn('w-full max-w-md mx-auto', getBackgroundColor(), className)}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <div className={getSeverityColor()}>{getErrorIcon()}</div>
        </div>
        <CardTitle className={cn('text-lg', getSeverityColor())}>{getErrorTitle()}</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          {recoveryStrategy?.userMessage || error.message}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Additional error details */}
        {error.details && (
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-white/50 dark:bg-black/20 p-3 rounded">
            {error.details}
          </div>
        )}

        {/* Retry information */}
        {recoveryStrategy?.maxRetries && retryCount > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Attempt {retryCount} of {recoveryStrategy.maxRetries}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          {recoveryStrategy?.canRecover && canRetry && (
            <Button
              onClick={handleRetry}
              disabled={isRecovering}
              variant="default"
              size="sm"
              className="flex-1"
            >
              {isRecovering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {getRecoveringText()}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {recoveryStrategy.actionLabel || 'Retry'}
                </>
              )}
            </Button>
          )}

          {recoveryStrategy?.recoveryAction === 'user_action' && (
            <Button onClick={handleUserAction} variant="default" size="sm" className="flex-1">
              {error.category === 'authentication' ? (
                <LogIn className="h-4 w-4 mr-2" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {recoveryStrategy.actionLabel || 'OK'}
            </Button>
          )}

          {!recoveryStrategy?.canRecover && (
            <Button onClick={clearError} variant="outline" size="sm" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          )}
        </div>

        {/* Help text */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">{getHelpText()}</div>

        {/* Development details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs text-gray-600 dark:text-gray-400">
            <summary className="cursor-pointer font-medium mb-2">Debug Information</summary>
            <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  )

  function getErrorTitle(): string {
    switch (error.category) {
      case 'network':
        return 'Connection Error'
      case 'authentication':
        return 'Authentication Required'
      case 'permission':
        return 'Access Denied'
      case 'media_format':
        return 'Unsupported Format'
      case 'player_library':
        return 'Player Error'
      case 'signed_url':
        return 'Media Link Expired'
      default:
        return 'Playback Error'
    }
  }

  function getRecoveringText(): string {
    switch (recoveryStrategy?.recoveryAction) {
      case 'refresh_url':
        return 'Refreshing...'
      case 'fallback':
        return 'Trying fallback...'
      default:
        return 'Retrying...'
    }
  }

  function getHelpText(): string {
    switch (error.category) {
      case 'network':
        return 'Check your internet connection and try again.'
      case 'authentication':
        return 'Please log in to continue watching.'
      case 'permission':
        return 'Contact support if you believe this is an error.'
      case 'media_format':
        return 'Try using a different browser or update your current one.'
      case 'player_library':
        return 'If the problem persists, try refreshing the page.'
      default:
        return 'If the problem continues, please refresh the page.'
    }
  }
}
