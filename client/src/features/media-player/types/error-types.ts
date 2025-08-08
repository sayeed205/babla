/**
 * Error handling types for the media player system
 * Defines comprehensive error types and recovery strategies
 */

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// Error categories
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'media_format'
  | 'player_library'
  | 'signed_url'
  | 'permission'
  | 'unknown'

// Base error interface
export interface MediaPlayerError {
  id: string
  category: ErrorCategory
  severity: ErrorSeverity
  message: string
  details?: string
  timestamp: number
  recoverable: boolean
  retryable: boolean
}

// Specific error types
export interface NetworkError extends MediaPlayerError {
  category: 'network'
  statusCode?: number
  endpoint?: string
}

export interface AuthenticationError extends MediaPlayerError {
  category: 'authentication'
  requiresLogin: boolean
  tokenExpired: boolean
}

export interface MediaFormatError extends MediaPlayerError {
  category: 'media_format'
  mimeType?: string
  supportedFormats: string[]
}

export interface PlayerLibraryError extends MediaPlayerError {
  category: 'player_library'
  libraryName: string
  libraryVersion?: string
}

export interface SignedUrlError extends MediaPlayerError {
  category: 'signed_url'
  urlExpired: boolean
  refreshAttempted: boolean
}

export interface PermissionError extends MediaPlayerError {
  category: 'permission'
  requiredPermission: string
}

// Union type for all error types
export type MediaPlayerErrorType =
  | NetworkError
  | AuthenticationError
  | MediaFormatError
  | PlayerLibraryError
  | SignedUrlError
  | PermissionError

// Error recovery strategy
export interface ErrorRecoveryStrategy {
  canRecover: boolean
  recoveryAction: 'retry' | 'refresh_url' | 'fallback' | 'user_action' | 'none'
  maxRetries?: number
  retryDelay?: number
  fallbackOptions?: string[]
  userMessage: string
  actionLabel?: string
}

// Error state for UI components
export interface ErrorState {
  hasError: boolean
  error: MediaPlayerErrorType | null
  recoveryStrategy: ErrorRecoveryStrategy | null
  isRecovering: boolean
  retryCount: number
}
