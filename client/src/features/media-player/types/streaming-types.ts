/**
 * Streaming-related types for signed URLs and media sources
 * Based on the backend API structure for streaming endpoints
 */

// Response from the backend stream URL endpoint
export interface StreamUrlResponse {
  streamUrl: string
  expiresAt: number
  size: number
  filename: string
  mimeType: string
  expiresIn: number
}

// Media source for player consumption
export interface MediaSource {
  url: string
  type: string // MIME type from mimeType field
  expiresAt: number
  size: number
  filename: string
}

// Streaming session management
export interface StreamingSession {
  mediaId: string
  mediaType: import('./media-player-types').MediaType
  source: MediaSource
  refreshTimer?: NodeJS.Timeout
  player?: any // Will be typed more specifically when player is implemented
}

// Streaming configuration
export interface StreamingConfig {
  autoRefreshBuffer: number // Time in seconds before expiry to refresh URL
  maxRetries: number
  retryDelay: number // Base delay in milliseconds
  chunkSize?: number // For progressive loading
}

// URL refresh status
export interface UrlRefreshStatus {
  isRefreshing: boolean
  lastRefresh: number
  nextRefresh: number
  retryCount: number
}

// Streaming error codes
export type StreamingErrorCode =
  | 'URL_FETCH_FAILED'
  | 'URL_REFRESH_FAILED'
  | 'REFRESH_IN_PROGRESS'
  | 'AUTH_FAILED'
  | 'API_ERROR'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
