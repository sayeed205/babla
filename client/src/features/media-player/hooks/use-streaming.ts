/**
 * React hook for managing media streaming
 * Provides easy access to streaming service functionality
 */

import { useCallback, useEffect, useRef } from 'react'
import { StreamingError, streamingService } from '../services/streaming-service'
import type { MediaType } from '../types/media-player-types'
import type { MediaSource } from '../types/streaming-types'

export interface UseStreamingOptions {
  onError?: (error: StreamingError) => void
  onUrlRefresh?: (source: MediaSource) => void
}

export interface UseStreamingReturn {
  getStreamingUrl: (mediaId: string, mediaType: MediaType) => Promise<MediaSource>
  refreshStreamingUrl: (mediaId: string, mediaType: MediaType) => Promise<MediaSource>
  cleanupSession: (mediaId: string, mediaType: MediaType) => void
  isLoading: boolean
  error: StreamingError | null
}

/**
 * Hook for managing media streaming URLs
 */
export function useStreaming(options: UseStreamingOptions = {}): UseStreamingReturn {
  const { onError, onUrlRefresh } = options
  const loadingRef = useRef(false)
  const errorRef = useRef<StreamingError | null>(null)

  // Cleanup sessions on unmount
  useEffect(() => {
    return () => {
      streamingService.cleanupAllSessions()
    }
  }, [])

  const getStreamingUrl = useCallback(
    async (mediaId: string, mediaType: MediaType): Promise<MediaSource> => {
      try {
        loadingRef.current = true
        errorRef.current = null

        const source = await streamingService.getStreamingUrl(mediaId, mediaType)

        return source
      } catch (error) {
        const streamingError =
          error instanceof StreamingError
            ? error
            : new StreamingError('Unknown streaming error', 'NETWORK_ERROR', error)

        errorRef.current = streamingError
        onError?.(streamingError)
        throw streamingError
      } finally {
        loadingRef.current = false
      }
    },
    [onError]
  )

  const refreshStreamingUrl = useCallback(
    async (mediaId: string, mediaType: MediaType): Promise<MediaSource> => {
      try {
        loadingRef.current = true
        errorRef.current = null

        const source = await streamingService.refreshStreamingUrl(mediaId, mediaType)
        onUrlRefresh?.(source)

        return source
      } catch (error) {
        const streamingError =
          error instanceof StreamingError
            ? error
            : new StreamingError('Unknown refresh error', 'URL_REFRESH_FAILED', error)

        errorRef.current = streamingError
        onError?.(streamingError)
        throw streamingError
      } finally {
        loadingRef.current = false
      }
    },
    [onError, onUrlRefresh]
  )

  const cleanupSession = useCallback((mediaId: string, mediaType: MediaType): void => {
    streamingService.cleanupSession(mediaId, mediaType)
  }, [])

  return {
    getStreamingUrl,
    refreshStreamingUrl,
    cleanupSession,
    isLoading: loadingRef.current,
    error: errorRef.current,
  }
}

/**
 * Hook for getting streaming URL for a specific media item
 * Automatically handles loading and error states
 */
export function useMediaStreamingUrl(
  mediaId: string | null,
  mediaType: MediaType,
  options: UseStreamingOptions = {}
) {
  const streaming = useStreaming(options)
  const sourceRef = useRef<MediaSource | null>(null)

  const loadStreamingUrl = useCallback(async () => {
    if (!mediaId) return null

    try {
      const source = await streaming.getStreamingUrl(mediaId, mediaType)
      sourceRef.current = source
      return source
    } catch (error) {
      sourceRef.current = null
      throw error
    }
  }, [mediaId, mediaType, streaming])

  // Cleanup when mediaId changes or component unmounts
  useEffect(() => {
    return () => {
      if (mediaId) {
        streaming.cleanupSession(mediaId, mediaType)
      }
    }
  }, [mediaId, mediaType, streaming])

  return {
    ...streaming,
    source: sourceRef.current,
    loadStreamingUrl,
  }
}
