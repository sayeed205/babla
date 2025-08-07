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
  UNKNOWN = 'unknown',
}

/**
 * Custom error class for signed URL operations
 */
export class SignedUrlError extends Error {
  constructor(
    public type: SignedUrlErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'SignedUrlError'
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
   * Internal method to fetch signed URL with retry logic
   * Requirements: 4.2, 4.3
   */
  private async fetchWithRetry(movieId: string, attempt: number): Promise<SignedUrlResponse> {
    try {
      const response = await apiClient.GET('/movies/{id}/stream-url', {
        params: {
          path: { id: movieId },
        },
      })

      if (response.error) {
        throw this.createErrorFromResponse(response.error)
      }

      if (!response.data) {
        throw new SignedUrlError(SignedUrlErrorType.SERVER, 'No data received from server')
      }

      return response.data
    } catch (error) {
      // If we've exhausted retries, throw the error
      if (attempt >= this.config.maxRetries) {
        throw error instanceof SignedUrlError ? error : this.createErrorFromUnknown(error)
      }

      // For certain error types, don't retry
      if (error instanceof SignedUrlError && error.type === SignedUrlErrorType.AUTHENTICATION) {
        throw error
      }

      // Wait before retrying with exponential backoff
      const delay = this.config.retryDelay * Math.pow(2, attempt)
      await this.sleep(delay)

      return this.fetchWithRetry(movieId, attempt + 1)
    }
  }

  /**
   * Create a SignedUrlError from API response error
   * Requirements: 4.2, 4.4
   */
  private createErrorFromResponse(error: any): SignedUrlError {
    // Check for authentication errors
    if (error.status === 401 || error.status === 403) {
      return new SignedUrlError(
        SignedUrlErrorType.AUTHENTICATION,
        'Authentication failed. Please log in again.',
        error
      )
    }

    // Check for server errors
    if (error.status >= 500) {
      return new SignedUrlError(
        SignedUrlErrorType.SERVER,
        'Server error occurred. Please try again later.',
        error
      )
    }

    // Check for network errors
    if (!error.status) {
      return new SignedUrlError(
        SignedUrlErrorType.NETWORK,
        'Network error occurred. Please check your connection.',
        error
      )
    }

    // Default to unknown error
    return new SignedUrlError(
      SignedUrlErrorType.UNKNOWN,
      `Request failed with status ${error.status}`,
      error
    )
  }

  /**
   * Create a SignedUrlError from unknown error
   */
  private createErrorFromUnknown(error: unknown): SignedUrlError {
    if (error instanceof Error) {
      return new SignedUrlError(SignedUrlErrorType.UNKNOWN, error.message, error)
    }

    return new SignedUrlError(SignedUrlErrorType.UNKNOWN, 'An unknown error occurred')
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
