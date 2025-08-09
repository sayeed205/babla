/**
 * Media streaming service that handles signed URL management
 * Provides automatic URL refresh, error handling, and retry logic
 */

import { apiClient } from '@/lib/api-client'
import type { MediaType } from '../types/media-player-types'
import type {
  MediaSource,
  StreamingConfig,
  StreamingErrorCode,
  StreamingSession,
  StreamUrlResponse,
  UrlRefreshStatus,
} from '../types/streaming-types'

export class StreamingService {
  private sessions = new Map<string, StreamingSession>()
  private refreshStatuses = new Map<string, UrlRefreshStatus>()

  private readonly config: StreamingConfig = {
    autoRefreshBuffer: 300, // Refresh 5 minutes before expiry
    maxRetries: 3,
    retryDelay: 1000, // 1 second base delay
  }

  /**
   * Get a streaming URL for a media item
   */
  async getStreamingUrl(mediaId: string, mediaType: MediaType): Promise<MediaSource> {
    const sessionKey = `${mediaType}-${mediaId}`

    try {
      // Check if we have a valid existing session
      const existingSession = this.sessions.get(sessionKey)
      if (existingSession && this.isUrlValid(existingSession.source)) {
        return existingSession.source
      }

      // Fetch new signed URL
      const source = await this.fetchSignedUrl(mediaId, mediaType)

      // Create or update session
      const session: StreamingSession = {
        mediaId,
        mediaType,
        source,
      }

      this.sessions.set(sessionKey, session)
      this.scheduleUrlRefresh(sessionKey, source.expiresAt)

      return source
    } catch (error) {
      throw new StreamingError(
        `Failed to get streaming URL for ${mediaType} ${mediaId}`,
        'URL_FETCH_FAILED',
        error
      )
    }
  }

  /**
   * Refresh a streaming URL before it expires
   */
  async refreshStreamingUrl(mediaId: string, mediaType: MediaType): Promise<MediaSource> {
    const sessionKey = `${mediaType}-${mediaId}`
    const refreshStatus = this.refreshStatuses.get(sessionKey)

    // Prevent concurrent refresh attempts
    if (refreshStatus?.isRefreshing) {
      throw new StreamingError('URL refresh already in progress', 'REFRESH_IN_PROGRESS')
    }

    this.setRefreshStatus(sessionKey, { isRefreshing: true })

    try {
      const source = await this.fetchSignedUrlWithRetry(mediaId, mediaType)

      // Update session
      const session = this.sessions.get(sessionKey)
      if (session) {
        session.source = source
        this.scheduleUrlRefresh(sessionKey, source.expiresAt)
      }

      this.setRefreshStatus(sessionKey, {
        isRefreshing: false,
        lastRefresh: Date.now(),
        nextRefresh: source.expiresAt * 1000 - this.config.autoRefreshBuffer * 1000,
        retryCount: 0,
      })

      return source
    } catch (error) {
      this.setRefreshStatus(sessionKey, {
        isRefreshing: false,
        retryCount: (refreshStatus?.retryCount || 0) + 1,
      })

      throw new StreamingError(
        `Failed to refresh streaming URL for ${mediaType} ${mediaId}`,
        'URL_REFRESH_FAILED',
        error
      )
    }
  }

  /**
   * Clean up a streaming session
   */
  cleanupSession(mediaId: string, mediaType: MediaType): void {
    const sessionKey = `${mediaType}-${mediaId}`
    const session = this.sessions.get(sessionKey)

    if (session?.refreshTimer) {
      clearTimeout(session.refreshTimer)
    }

    this.sessions.delete(sessionKey)
    this.refreshStatuses.delete(sessionKey)
  }

  /**
   * Clean up all sessions
   */
  cleanupAllSessions(): void {
    for (const [sessionKey] of this.sessions) {
      const session = this.sessions.get(sessionKey)
      if (session?.refreshTimer) {
        clearTimeout(session.refreshTimer)
      }
    }

    this.sessions.clear()
    this.refreshStatuses.clear()
  }

  /**
   * Check if a URL is still valid (not expired)
   */
  private isUrlValid(source: MediaSource): boolean {
    const now = Math.floor(Date.now() / 1000)
    const bufferTime = this.config.autoRefreshBuffer
    return source.expiresAt > now + bufferTime
  }

  /**
   * Fetch signed URL from the backend API
   */
  private async fetchSignedUrl(mediaId: string, mediaType: MediaType): Promise<MediaSource> {
    // Currently only movies are supported, but this can be extended
    if (mediaType !== 'movie') {
      throw new StreamingError(
        `Media type ${mediaType} is not yet supported`,
        'UNSUPPORTED_MEDIA_TYPE'
      )
    }

    const response = await apiClient.GET('/movies/{id}/stream-url', {
      params: { path: { id: mediaId } },
    })

    if (response.error) {
      if (response.response.status === 401) {
        throw new StreamingError('Authentication failed', 'AUTH_FAILED', response.error)
      }

      throw new StreamingError('Failed to fetch signed URL', 'API_ERROR', response.error)
    }

    const data = response.data as StreamUrlResponse

    return {
      url: data.streamUrl,
      type: data.mimeType,
      expiresAt: data.expiresAt,
      size: data.size,
      filename: data.filename,
    }
  }

  /**
   * Fetch signed URL with exponential backoff retry logic
   */
  private async fetchSignedUrlWithRetry(
    mediaId: string,
    mediaType: MediaType,
    attempt: number = 1
  ): Promise<MediaSource> {
    try {
      return await this.fetchSignedUrl(mediaId, mediaType)
    } catch (error) {
      if (attempt >= this.config.maxRetries) {
        throw error
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = this.config.retryDelay * Math.pow(2, attempt - 1)
      await this.sleep(delay)

      return this.fetchSignedUrlWithRetry(mediaId, mediaType, attempt + 1)
    }
  }

  /**
   * Schedule automatic URL refresh before expiry
   */
  private scheduleUrlRefresh(sessionKey: string, expiresAt: number): void {
    const session = this.sessions.get(sessionKey)
    if (!session) return

    // Clear existing timer
    if (session.refreshTimer) {
      clearTimeout(session.refreshTimer)
    }

    // Calculate when to refresh (buffer time before expiry)
    const now = Date.now()
    const expiryTime = expiresAt * 1000 // Convert to milliseconds
    const refreshTime = expiryTime - this.config.autoRefreshBuffer * 1000
    const delay = Math.max(0, refreshTime - now)

    // Schedule refresh
    session.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshStreamingUrl(session.mediaId, session.mediaType)
      } catch (error) {
        console.error('Automatic URL refresh failed:', error)
        // Could emit an event here for the UI to handle
      }
    }, delay)

    // Update refresh status
    this.setRefreshStatus(sessionKey, {
      nextRefresh: refreshTime,
      isRefreshing: false,
      retryCount: 0,
    })
  }

  /**
   * Update refresh status for a session
   */
  private setRefreshStatus(sessionKey: string, updates: Partial<UrlRefreshStatus>): void {
    const current = this.refreshStatuses.get(sessionKey) || {
      isRefreshing: false,
      lastRefresh: 0,
      nextRefresh: 0,
      retryCount: 0,
    }

    this.refreshStatuses.set(sessionKey, { ...current, ...updates })
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Get refresh status for a session (useful for debugging/monitoring)
   */
  getRefreshStatus(mediaId: string, mediaType: MediaType): UrlRefreshStatus | null {
    const sessionKey = `${mediaType}-${mediaId}`
    return this.refreshStatuses.get(sessionKey) || null
  }

  /**
   * Get all active sessions (useful for debugging/monitoring)
   */
  getActiveSessions(): Array<{ sessionKey: string; session: StreamingSession }> {
    return Array.from(this.sessions.entries()).map(([sessionKey, session]) => ({
      sessionKey,
      session,
    }))
  }
}

/**
 * Custom error class for streaming-related errors
 */
export class StreamingError extends Error {
  constructor(
    message: string,
    public code: StreamingErrorCode,
    public cause?: unknown
  ) {
    super(message)
    this.name = 'StreamingError'
  }
}

// Export singleton instance
export const streamingService = new StreamingService()
