/**
 * MediaPlayerErrorBoundary Component
 * React error boundary specifically for media player components
 * Provides graceful error handling and recovery options
 */

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react'
import type { ErrorInfo, ReactNode } from 'react'

import React, { Component } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class MediaPlayerErrorBoundary extends Component<Props, State> {
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    })

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo)

    // Log error for debugging
    console.error('MediaPlayer Error Boundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      return
    }

    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }))

    // Call the onRetry callback if provided
    this.props.onRetry?.()
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Card className="w-full max-w-md mx-auto bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="text-red-700 dark:text-red-300">Media Player Error</CardTitle>
            <CardDescription className="text-red-600 dark:text-red-400">
              {this.getErrorMessage()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-xs text-gray-600 dark:text-gray-400">
                <summary className="cursor-pointer font-medium mb-2">Technical Details</summary>
                <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              {this.state.retryCount < this.maxRetries && (
                <Button onClick={this.handleRetry} variant="default" size="sm" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry ({this.maxRetries - this.state.retryCount} left)
                </Button>
              )}

              <Button onClick={this.handleReset} variant="outline" size="sm" className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Player
              </Button>
            </div>

            {/* Additional help text */}
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <p>If the problem persists, try refreshing the page.</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }

  private getErrorMessage(): string {
    if (!this.state.error) {
      return 'An unexpected error occurred in the media player.'
    }

    const error = this.state.error

    // Check for specific error types
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return 'Network connection failed. Please check your internet connection.'
    }

    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return 'Authentication failed. Please log in and try again.'
    }

    if (error.message.includes('format') || error.message.includes('codec')) {
      return 'This media format is not supported by your browser.'
    }

    if (error.message.includes('permission') || error.message.includes('access')) {
      return 'You do not have permission to access this content.'
    }

    // Generic error message
    return 'The media player encountered an unexpected error.'
  }
}

/**
 * Hook version of the error boundary for functional components
 */
export function useMediaPlayerErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return {
    captureError,
    resetError,
    hasError: !!error,
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withMediaPlayerErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <MediaPlayerErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </MediaPlayerErrorBoundary>
  )

  WrappedComponent.displayName = `withMediaPlayerErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
