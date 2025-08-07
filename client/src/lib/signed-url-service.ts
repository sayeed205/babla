import { apiClient } from './api-client'

/**
 * Response structure from the /movies/{id}/stream-url endpoint
 */
export interface SignedUrlResponse {
  streamUrl: string
  expiresAt: number
  expiresIn: number
}

/**
 * Configuration options for the SignedUrlService
 */
export interface SignedUrlServiceConfig {
  /** Time in seconds before expiry to refresh the URL (default: 300 seconds / 5 minutes) */
  refreshBufferTime: number
  /** Maximum number of retry attempts for failed requests (default: 3) */
  maxRetries: number
  /** Base delay in milliseconds between retry attempts (default: 1000ms) */
  retryDelay: number
}

/**
 * Error types that can occur during signed URL operations
 */
export enum SignedUrlErrorType {
  AUTHENTICATION = 'authentication',
  NETWORK = 'network',
  SERVER = 'server',
  TIMEOUT = 'timeout',
  PLAYBACK = 'playback',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels for different error types
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Custom error class for signed URL operations with enhanced classification
 */
export class SignedUrlError extends Error {
  public readonly timestamp: number
  public readonly severity: ErrorSeverity
  public readonly isRetryable: boolean
  public readonly userMessage: string

  constructor(
    public type: SignedUrlErrorType,
    message: string,
    public originalError?: Error,
    userMessage?: string
  ) {
    super(message)
    this.name = 'SignedUrlError'
    this.timestamp = Date.now()
    this.userMessage = userMessage || this.generateUserMessage()
    this.severity = this.determineSeverity()
    this.isRetryable = this.determineRetryability()
  }

  /**
   * Generate user-friendly error message based on error type
   */
  private generateUserMessage(): string {
    switch (this.type) {
      case SignedUrlErrorType.AUTHENTICATION:
        return 'Please log in again to continue watching.'
      case SignedUrlErrorType.NETWORK:
        return 'Connection issue detected. Please check your internet connection.'
      case SignedUrlErrorType.SERVER:
        return 'Server is temporarily unavailable. Please try again in a few moments.'
      case SignedUrlErrorType.TIMEOUT:
        return 'Request timed out. Please try again.'
      case SignedUrlErrorType.PLAYBACK:
        return 'Video playback error. Attempting to recover...'
      case SignedUrlErrorType.VALIDATION:
        return 'Invalid video source. Please contact support if this persists.'
      case SignedUrlErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment before trying again.'
      default:
        return 'An unexpected error occurred. Please try refreshing the page.'
    }
  }

  /**
   * Determine error severity based on type
   */
  private determineSeverity(): ErrorSeverity {
    switch (this.type) {
      case SignedUrlErrorType.AUTHENTICATION:
        return ErrorSeverity.HIGH
      case SignedUrlErrorType.VALIDATION:
        return ErrorSeverity.HIGH
      case SignedUrlErrorType.SERVER:
        return ErrorSeverity.MEDIUM
      case SignedUrlErrorType.NETWORK:
      case SignedUrlErrorType.TIMEOUT:
      case SignedUrlErrorType.PLAYBACK:
        return ErrorSeverity.MEDIUM
      case SignedUrlErrorType.RATE_LIMIT:
        return ErrorSeverity.LOW
      default:
        return ErrorSeverity.MEDIUM
    }
  }

  /**
   * Determine if error is retryable based on type
   */
  private determineRetryability(): boolean {
    switch (this.type) {
      case SignedUrlErrorType.AUTHENTICATION:
      case SignedUrlErrorType.VALIDATION:
        return false
      case SignedUrlErrorType.NETWORK:
      case SignedUrlErrorType.SERVER:
      case SignedUrlErrorType.TIMEOUT:
      case SignedUrlErrorType.PLAYBACK:
      case SignedUrlErrorType.RATE_LIMIT:
        return true
      default:
        return false
    }
  }

  /**
   * Get recommended retry delay in milliseconds
   */
  getRetryDelay(attempt: number): number {
    const baseDelay = this.type === SignedUrlErrorType.RATE_LIMIT ? 5000 : 1000
    return baseDelay * Math.pow(2, attempt)
  }
}

/**
 * Service class for managing signed URLs for movie streaming
 * Handles fetching, refreshing, and automatic URL management
 */
export class SignedUrlService {
  private config: SignedUrlServiceConfig
  private refreshTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(config: Partial<SignedUrlServiceConfig> = {}) {
    this.config = {
      refreshBufferTime: 300, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    }
  }

  /**
   * Fetch a signed URL for a movie
   * Requirements: 1.2, 4.1
   */
  async getSignedUrl(movieId: string): Promise<SignedUrlResponse> {
    return this.fetchWithRetry(movieId, 0)
  }

  /**
   * Refresh an existing signed URL
   * Requirements: 1.4, 4.3
   */
  async refreshSignedUrl(movieId: string): Promise<SignedUrlResponse> {
    return this.fetchWithRetry(movieId, 0)
  }

  /**
   * Schedule automatic refresh of a signed URL before it expires
   * Requirements: 1.4
   */
  scheduleRefresh(
    movieId: string,
    expiresAt: number,
    callback: (response: SignedUrlResponse) => void
  ): NodeJS.Timeout {
    // Clear any existing timer for this movie
    this.clearRefreshTimer(movieId)

    const refreshTime = this.calculateRefreshTime(expiresAt, this.config.refreshBufferTime)
    const delay = Math.max(0, refreshTime - Date.now())

    console.log(
      `Scheduling proactive URL refresh for movie ${movieId} in ${Math.round(delay / 1000)} seconds`
    )

    const timer = setTimeout(async () => {
      try {
        console.log(`Executing proactive URL refresh for movie ${movieId}`)
        const response = await this.refreshSignedUrl(movieId)
        callback(response)

        // Schedule the next refresh
        this.scheduleRefresh(movieId, response.expiresAt, callback)
      } catch (error) {
        console.error(`Failed to refresh signed URL for movie ${movieId}:`, error)
        // Don't schedule another refresh on error - let the component handle it
      }
    }, delay)

    this.refreshTimers.set(movieId, timer)
    return timer
  }

  /**
   * Clear the refresh timer for a specific movie
   */
  clearRefreshTimer(movieId: string): void {
    const timer = this.refreshTimers.get(movieId)
    if (timer) {
      clearTimeout(timer)
      this.refreshTimers.delete(movieId)
    }
  }

  /**
   * Clear all refresh timers
   */
  clearAllRefreshTimers(): void {
    this.refreshTimers.forEach((timer) => clearTimeout(timer))
    this.refreshTimers.clear()
  }

  /**
   * Calculate when to refresh the URL based on expiry time and buffer
   * Requirements: 1.4
   */
  calculateRefreshTime(expiresAt: number, bufferTime: number): number {
    // Convert expiresAt from seconds to milliseconds and subtract buffer time
    return expiresAt * 1000 - bufferTime * 1000
  }

  /**
   * Check if a URL should be refreshed based on current time and expiry
   */
  shouldRefresh(expiresAt: number): boolean {
    const refreshTime = this.calculateRefreshTime(expiresAt, this.config.refreshBufferTime)
    return Date.now() >= refreshTime
  }

  /**
   * Check if a URL has expired
   */
  isExpired(expiresAt: number): boolean {
    return Date.now() >= expiresAt * 1000
  }

  /**
   * Get time remaining until URL expires (in seconds)
   */
  getTimeUntilExpiry(expiresAt: number): number {
    return Math.max(0, expiresAt - Math.floor(Date.now() / 1000))
  }

  /**
   * Get time remaining until proactive refresh (in seconds)
   */
  getTimeUntilRefresh(expiresAt: number): number {
    const refreshTime = this.calculateRefreshTime(expiresAt, this.config.refreshBufferTime)
    return Math.max(0, Math.floor((refreshTime - Date.now()) / 1000))
  }

  /**
   * Internal method to fetch signed URL with enhanced retry logic and exponential backoff
   * Requirements: 4.2, 4.3
   */
  private async fetchWithRetry(movieId: string, attempt: number): Promise<SignedUrlResponse> {
    const startTime = Date.now()

    try {
      console.log(
        `Fetching signed URL for movie ${movieId} (attempt ${attempt + 1}/${this.config.maxRetries + 1})`
      )

      const response = await apiClient.GET('/movies/{id}/stream-url', {
        params: {
          path: { id: movieId },
        },
      })

      if (response.error) {
        throw this.createErrorFromResponse(response.error)
      }

      if (!response.data) {
        throw new SignedUrlError(
          SignedUrlErrorType.SERVER,
          'No data received from server',
          undefined,
          'Server response was empty. Please try again.'
        )
      }

      // Validate response data
      if (!response.data.streamUrl || !response.data.expiresAt) {
        throw new SignedUrlError(
          SignedUrlErrorType.VALIDATION,
          'Invalid response data structure',
          undefined,
          'Invalid server response. Please contact support.'
        )
      }

      const duration = Date.now() - startTime
      console.log(`Successfully fetched signed URL for movie ${movieId} in ${duration}ms`)

      return response.data
    } catch (error) {
      const duration = Date.now() - startTime
      const signedUrlError =
        error instanceof SignedUrlError ? error : this.createErrorFromUnknown(error)

      console.error(
        `Failed to fetch signed URL for movie ${movieId} (attempt ${attempt + 1}) after ${duration}ms:`,
        signedUrlError
      )

      // If we've exhausted retries, throw the error
      if (attempt >= this.config.maxRetries) {
        console.error(`Max retries (${this.config.maxRetries}) exceeded for movie ${movieId}`)
        throw signedUrlError
      }

      // Check if error is retryable
      if (!signedUrlError.isRetryable) {
        console.log(`Error is not retryable for movie ${movieId}:`, signedUrlError.type)
        throw signedUrlError
      }

      // Calculate delay with jitter to prevent thundering herd
      const baseDelay = signedUrlError.getRetryDelay(attempt)
      const jitter = Math.random() * 0.1 * baseDelay // Add up to 10% jitter
      const delay = Math.floor(baseDelay + jitter)

      console.log(
        `Retrying in ${delay}ms for movie ${movieId} (attempt ${attempt + 2}/${this.config.maxRetries + 1})`
      )

      await this.sleep(delay)
      return this.fetchWithRetry(movieId, attempt + 1)
    }
  }

  /**
   * Create a SignedUrlError from API response error with comprehensive classification
   * Requirements: 4.2, 4.4
   */
  private createErrorFromResponse(error: any): SignedUrlError {
    const status = error.status
    const message = error.message || error.statusText || 'Unknown error'

    // Authentication errors (401, 403)
    if (status === 401) {
      return new SignedUrlError(
        SignedUrlErrorType.AUTHENTICATION,
        'Authentication token expired or invalid',
        error,
        'Your session has expired. Please log in again.'
      )
    }

    if (status === 403) {
      return new SignedUrlError(
        SignedUrlErrorType.AUTHENTICATION,
        'Access forbidden for this resource',
        error,
        'You do not have permission to access this video.'
      )
    }

    // Client errors (400-499)
    if (status === 400) {
      return new SignedUrlError(
        SignedUrlErrorType.VALIDATION,
        'Invalid request parameters',
        error,
        'Invalid video request. Please try refreshing the page.'
      )
    }

    if (status === 404) {
      return new SignedUrlError(
        SignedUrlErrorType.VALIDATION,
        'Video not found',
        error,
        'This video is no longer available.'
      )
    }

    if (status === 429) {
      return new SignedUrlError(
        SignedUrlErrorType.RATE_LIMIT,
        'Rate limit exceeded',
        error,
        'Too many requests. Please wait a moment before trying again.'
      )
    }

    // Server errors (500-599)
    if (status >= 500 && status < 600) {
      const serverMessage =
        status === 503
          ? 'Service temporarily unavailable. Please try again in a few minutes.'
          : 'Server error occurred. Our team has been notified.'

      return new SignedUrlError(
        SignedUrlErrorType.SERVER,
        `Server error: ${status} ${message}`,
        error,
        serverMessage
      )
    }

    // Network errors (no status code)
    if (!status || status === 0) {
      // Check for specific network error types
      if (error.name === 'TimeoutError' || message.includes('timeout')) {
        return new SignedUrlError(
          SignedUrlErrorType.TIMEOUT,
          'Request timeout',
          error,
          'Request timed out. Please check your connection and try again.'
        )
      }

      if (
        error.name === 'NetworkError' ||
        message.includes('network') ||
        message.includes('fetch')
      ) {
        return new SignedUrlError(
          SignedUrlErrorType.NETWORK,
          'Network connection failed',
          error,
          'Unable to connect to the server. Please check your internet connection.'
        )
      }

      return new SignedUrlError(
        SignedUrlErrorType.NETWORK,
        'Network error occurred',
        error,
        'Connection problem detected. Please check your internet connection.'
      )
    }

    // Unknown client errors
    if (status >= 400 && status < 500) {
      return new SignedUrlError(
        SignedUrlErrorType.VALIDATION,
        `Client error: ${status} ${message}`,
        error,
        'Request failed. Please try refreshing the page.'
      )
    }

    // Default to unknown error
    return new SignedUrlError(
      SignedUrlErrorType.UNKNOWN,
      `Unexpected error: ${status} ${message}`,
      error,
      'An unexpected error occurred. Please try refreshing the page.'
    )
  }

  /**
   * Create a SignedUrlError from unknown error with enhanced classification
   */
  private createErrorFromUnknown(error: unknown): SignedUrlError {
    if (error instanceof Error) {
      // Try to classify based on error name and message
      const errorName = error.name.toLowerCase()
      const errorMessage = error.message.toLowerCase()

      if (errorName.includes('timeout') || errorMessage.includes('timeout')) {
        return new SignedUrlError(
          SignedUrlErrorType.TIMEOUT,
          `Timeout error: ${error.message}`,
          error,
          'Request timed out. Please try again.'
        )
      }

      if (
        errorName.includes('network') ||
        errorMessage.includes('network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('connection')
      ) {
        return new SignedUrlError(
          SignedUrlErrorType.NETWORK,
          `Network error: ${error.message}`,
          error,
          'Network connection failed. Please check your internet connection.'
        )
      }

      if (errorMessage.includes('abort')) {
        return new SignedUrlError(
          SignedUrlErrorType.NETWORK,
          `Request aborted: ${error.message}`,
          error,
          'Request was cancelled. Please try again.'
        )
      }

      return new SignedUrlError(
        SignedUrlErrorType.UNKNOWN,
        `Unknown error: ${error.message}`,
        error,
        'An unexpected error occurred. Please try refreshing the page.'
      )
    }

    return new SignedUrlError(
      SignedUrlErrorType.UNKNOWN,
      'An unknown error occurred',
      undefined,
      'An unexpected error occurred. Please try refreshing the page.'
    )
  }

  /**
   * Utility method to sleep for a given number of milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Cleanup method to clear all timers when service is no longer needed
   */
  destroy(): void {
    this.clearAllRefreshTimers()
  }
}

/**
 * Default instance of SignedUrlService with standard configuration
 */
export const signedUrlService = new SignedUrlService()
