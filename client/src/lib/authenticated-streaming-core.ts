/**
 * AuthenticatedStreamingCore - Handles chunked fetching with Bearer token authentication
 * for video and audio streaming with MSE support
 */

export interface StreamingConfig {
  chunkSize: number // Default: 1MB
  maxRetries: number // Default: 3
  retryDelay: number // Default: 1000ms
  bufferAhead: number // Default: 30 seconds
  bufferBehind: number // Default: 30 seconds
}

export interface ChunkRequest {
  start: number
  end: number
  priority: 'high' | 'normal' | 'low'
}

export interface StreamingError extends Error {
  type: 'AUTHENTICATION' | 'NETWORK' | 'CHUNK_LOAD_FAILED'
  status?: number
  retryCount?: number
  recoverable: boolean
}

export class AuthenticatedStreamingCore {
  private config: StreamingConfig

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = {
      chunkSize: 1024 * 1024, // 1MB default
      maxRetries: 3,
      retryDelay: 1000,
      bufferAhead: 30,
      bufferBehind: 30,
      ...config,
    }
  }

  /**
   * Fetches a chunk of data from the authenticated endpoint with Range headers
   * @param src - The source URL for the media file
   * @param range - The byte range to fetch
   * @param token - Bearer token for authentication
   * @returns Promise<ArrayBuffer> - The chunk data
   */
  async fetchChunk(src: string, range: ChunkRequest, token: string): Promise<ArrayBuffer> {
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
      Range: `bytes=${range.start}-${range.end}`,
    }

    try {
      const response = await fetch(src, {
        method: 'GET',
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        throw this.createStreamingError(response.status, response.statusText)
      }

      const arrayBuffer = await response.arrayBuffer()
      return arrayBuffer
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error // Re-throw StreamingError
      }

      // Convert generic errors to StreamingError
      throw this.createStreamingError(
        0,
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK'
      )
    }
  }

  /**
   * Detects total file size from Content-Range headers
   * @param src - The source URL for the media file
   * @param token - Bearer token for authentication
   * @returns Promise<number> - The total file size in bytes
   */
  async getFileSize(src: string, token: string): Promise<number> {
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
      Range: 'bytes=0-0', // Request just the first byte to get Content-Range header
    }

    try {
      const response = await fetch(src, {
        method: 'GET',
        headers,
        credentials: 'include',
      })

      if (!response.ok) {
        throw this.createStreamingError(response.status, response.statusText)
      }

      const contentRange = response.headers.get('Content-Range')
      if (!contentRange) {
        // Fallback: try to get Content-Length from a HEAD request
        return await this.getFileSizeFromHead(src, token)
      }

      // Parse Content-Range header: "bytes 0-0/1234567"
      const match = contentRange.match(/bytes \d+-\d+\/(\d+)/)
      if (!match) {
        throw this.createStreamingError(0, 'Invalid Content-Range header format', 'NETWORK')
      }

      return parseInt(match[1], 10)
    } catch (error) {
      if (error instanceof Error && 'type' in error) {
        throw error // Re-throw StreamingError
      }

      throw this.createStreamingError(
        0,
        error instanceof Error ? error.message : 'Failed to get file size',
        'NETWORK'
      )
    }
  }

  /**
   * Fallback method to get file size using HEAD request
   * @param src - The source URL for the media file
   * @param token - Bearer token for authentication
   * @returns Promise<number> - The total file size in bytes
   */
  private async getFileSizeFromHead(src: string, token: string): Promise<number> {
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    }

    const response = await fetch(src, {
      method: 'HEAD',
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      throw this.createStreamingError(response.status, response.statusText)
    }

    const contentLength = response.headers.get('Content-Length')
    if (!contentLength) {
      throw this.createStreamingError(0, 'Unable to determine file size', 'NETWORK')
    }

    return parseInt(contentLength, 10)
  }

  /**
   * Implements exponential backoff retry logic for failed requests
   * @param operation - The async operation to retry
   * @param maxRetries - Maximum number of retry attempts (defaults to config)
   * @returns Promise<T> - The result of the successful operation
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        // Don't retry authentication errors
        if (this.isStreamingError(error) && error.type === 'AUTHENTICATION') {
          throw error
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          if (this.isStreamingError(lastError)) {
            lastError.retryCount = attempt
          }
          throw lastError
        }

        // Calculate exponential backoff delay
        const delay = this.config.retryDelay * Math.pow(2, attempt)
        await this.sleep(delay)
      }
    }

    throw lastError!
  }

  /**
   * Creates a standardized StreamingError
   * @param status - HTTP status code
   * @param message - Error message
   * @param type - Error type (defaults based on status)
   * @returns StreamingError
   */
  private createStreamingError(
    status: number,
    message: string,
    type?: StreamingError['type']
  ): StreamingError {
    let errorType: StreamingError['type'] = type || 'NETWORK'
    let recoverable = true

    if (status === 401 || status === 403) {
      errorType = 'AUTHENTICATION'
      recoverable = false
    } else if (status >= 400 && status < 500) {
      recoverable = false
    }

    const error = new Error(message) as StreamingError
    error.type = errorType
    error.status = status
    error.recoverable = recoverable

    return error
  }

  /**
   * Type guard to check if an error is a StreamingError
   * @param error - The error to check
   * @returns boolean
   */
  private isStreamingError(error: any): error is StreamingError {
    return error && typeof error === 'object' && 'type' in error
  }

  /**
   * Utility method to sleep for a specified duration
   * @param ms - Milliseconds to sleep
   * @returns Promise<void>
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Gets the current streaming configuration
   * @returns StreamingConfig
   */
  getConfig(): StreamingConfig {
    return { ...this.config }
  }

  /**
   * Updates the streaming configuration
   * @param newConfig - Partial configuration to merge
   */
  updateConfig(newConfig: Partial<StreamingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }
}
