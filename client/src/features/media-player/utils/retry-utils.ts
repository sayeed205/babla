/**
 * Retry utilities for media player error handling
 * Provides exponential backoff and retry logic for failed operations
 */

import type { MediaPlayerErrorType } from '../types/error-types'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryableErrors: readonly string[]
}

export interface RetryResult<T> {
  success: boolean
  result?: T
  error?: MediaPlayerErrorType
  attempts: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryableErrors: ['network', 'signed_url', 'player_library'],
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: MediaPlayerErrorType | undefined
  let attempts = 0

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    attempts = attempt + 1

    try {
      const result = await operation()
      return {
        success: true,
        result,
        attempts,
      }
    } catch (error) {
      lastError = error as MediaPlayerErrorType

      // Check if error is retryable
      if (!isRetryableError(lastError, finalConfig.retryableErrors)) {
        break
      }

      // Don't wait after the last attempt
      if (attempt < finalConfig.maxRetries) {
        const delay = calculateDelay(attempt, finalConfig)
        await sleep(delay)
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
  }
}

/**
 * Check if an error is retryable based on its category
 */
export function isRetryableError(
  error: MediaPlayerErrorType,
  retryableCategories: readonly string[]
): boolean {
  if (!error.retryable) {
    return false
  }

  return retryableCategories.includes(error.category)
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelay * Math.pow(config.backoffFactor, attempt)
  return Math.min(delay, config.maxDelay)
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry wrapper for streaming operations
 */
export class StreamingRetryManager {
  private retryConfigs = new Map<string, RetryConfig>()

  constructor(private defaultConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {}

  /**
   * Set retry configuration for a specific operation type
   */
  setRetryConfig(operationType: string, config: Partial<RetryConfig>): void {
    this.retryConfigs.set(operationType, { ...this.defaultConfig, ...config })
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operationType: string,
    operation: () => Promise<T>
  ): Promise<RetryResult<T>> {
    const config = this.retryConfigs.get(operationType) || this.defaultConfig
    return withRetry(operation, config)
  }

  /**
   * Get retry configuration for operation type
   */
  getRetryConfig(operationType: string): RetryConfig {
    return this.retryConfigs.get(operationType) || this.defaultConfig
  }
}

/**
 * Predefined retry configurations for common operations
 */
export const RETRY_CONFIGS = {
  STREAM_URL_FETCH: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    retryableErrors: ['network', 'signed_url'],
  },
  STREAM_URL_REFRESH: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    retryableErrors: ['network', 'signed_url'],
  },
  MEDIA_LOAD: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffFactor: 2,
    retryableErrors: ['network', 'player_library'],
  },
  AUTHENTICATION: {
    maxRetries: 1,
    baseDelay: 1000,
    maxDelay: 1000,
    backoffFactor: 1,
    retryableErrors: ['authentication'],
  },
} as const

/**
 * Create a retry manager with predefined configurations
 */
export function createStreamingRetryManager(): StreamingRetryManager {
  const manager = new StreamingRetryManager()

  // Set up predefined configurations
  Object.entries(RETRY_CONFIGS).forEach(([operationType, config]) => {
    manager.setRetryConfig(operationType, config)
  })

  return manager
}

/**
 * Utility to determine if an operation should be retried based on error
 */
export function shouldRetryOperation(
  error: MediaPlayerErrorType,
  operationType: string,
  currentAttempt: number
): boolean {
  const config = RETRY_CONFIGS[operationType as keyof typeof RETRY_CONFIGS]

  if (!config) {
    return false
  }

  if (currentAttempt >= config.maxRetries) {
    return false
  }

  return isRetryableError(error, config.retryableErrors)
}

/**
 * Format retry information for user display
 */
export function formatRetryInfo(
  attempts: number,
  maxRetries: number,
  nextRetryDelay?: number
): string {
  if (attempts >= maxRetries) {
    return `Failed after ${attempts} attempts`
  }

  if (nextRetryDelay) {
    const seconds = Math.ceil(nextRetryDelay / 1000)
    return `Attempt ${attempts} of ${maxRetries}. Retrying in ${seconds}s...`
  }

  return `Attempt ${attempts} of ${maxRetries}`
}
