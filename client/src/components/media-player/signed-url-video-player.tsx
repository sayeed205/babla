import { useAuthStore } from '@/features/auth/stores/auth-store'
import { SignedUrlError, SignedUrlService } from '@/lib/signed-url-service'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface SignedUrlVideoPlayerProps {
  src: string
  poster?: string
  className?: string
  autoPlay?: boolean
  onLoadedMetadata?: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onError?: (error: string) => void
  onWaiting?: () => void
  onCanPlay?: () => void
  videoRef?: React.RefObject<HTMLVideoElement>
}

interface SignedUrlVideoPlayerState {
  signedUrl: string | null
  isLoading: boolean
  error: string | null
  urlExpiresAt: number | null
  refreshTimer: NodeJS.Timeout | null
  movieId: string | null
  isRefreshing: boolean
  lastRefreshTime: number
  refreshAttempts: number
  playbackState: {
    currentTime: number
    paused: boolean
    wasPlaying: boolean
  }
}

export const SignedUrlVideoPlayer: React.FC<SignedUrlVideoPlayerProps> = ({
  src,
  poster,
  className,
  autoPlay = false,
  onLoadedMetadata,
  onTimeUpdate,
  onEnded,
  onError,
  onWaiting,
  onCanPlay,
  videoRef: externalVideoRef,
}) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null)
  const videoRef = externalVideoRef || internalVideoRef
  const signedUrlServiceRef = useRef<SignedUrlService | null>(null)
  const isMountedRef = useRef<boolean>(true)

  const [state, setState] = useState<SignedUrlVideoPlayerState>({
    signedUrl: null,
    isLoading: true,
    error: null,
    urlExpiresAt: null,
    refreshTimer: null,
    movieId: null,
    isRefreshing: false,
    lastRefreshTime: 0,
    refreshAttempts: 0,
    playbackState: {
      currentTime: 0,
      paused: true,
      wasPlaying: false,
    },
  })

  // Get auth state
  const { isAuthenticated, isLoading: authLoading } = useAuthStore()

  // Initialize SignedUrlService
  useEffect(() => {
    signedUrlServiceRef.current = new SignedUrlService({
      refreshBufferTime: 300, // 5 minutes
      maxRetries: 3,
      retryDelay: 1000,
    })

    return () => {
      if (signedUrlServiceRef.current) {
        signedUrlServiceRef.current.destroy()
      }
      isMountedRef.current = false
    }
  }, [])

  // Extract movie ID from source URL
  const extractMovieId = useCallback((source: string): string | null => {
    // Handle different URL patterns that might be used in the application
    // Pattern 1: Direct movie ID
    if (/^[a-zA-Z0-9-_]+$/.test(source)) {
      return source
    }

    // Pattern 2: URL with movie ID in path (/movies/{id} or /api/movies/{id})
    const pathMatch = source.match(/\/movies\/([a-zA-Z0-9-_]+)/)
    if (pathMatch) {
      return pathMatch[1]
    }

    // Pattern 3: URL with movie ID as query parameter (?movieId=...)
    const queryMatch = source.match(/[?&]movieId=([a-zA-Z0-9-_]+)/)
    if (queryMatch) {
      return queryMatch[1]
    }

    // Pattern 4: URL with id parameter (?id=...)
    const idMatch = source.match(/[?&]id=([a-zA-Z0-9-_]+)/)
    if (idMatch) {
      return idMatch[1]
    }

    console.warn('Could not extract movie ID from source:', source)
    return null
  }, [])

  // Handle errors with proper classification
  const handleError = useCallback(
    (error: string | SignedUrlError) => {
      const errorMessage = error instanceof SignedUrlError ? error.message : error

      setState((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }))

      // Log error for debugging
      console.error('SignedUrlVideoPlayer Error:', error)

      onError?.(errorMessage)
    },
    [onError]
  )

  // Save current playback state before URL refresh
  const savePlaybackState = useCallback(() => {
    if (!videoRef.current) return

    setState((prev) => ({
      ...prev,
      playbackState: {
        currentTime: videoRef.current?.currentTime || 0,
        paused: videoRef.current?.paused || true,
        wasPlaying: !videoRef.current?.paused || false,
      },
    }))
  }, [videoRef])

  // Restore playback state after URL refresh
  const restorePlaybackState = useCallback(async () => {
    if (!videoRef.current) return

    const { currentTime, wasPlaying } = state.playbackState

    // Wait for video to be ready
    if (videoRef.current.readyState < 2) {
      await new Promise<void>((resolve) => {
        const handleCanPlay = () => {
          videoRef.current?.removeEventListener('canplay', handleCanPlay)
          resolve()
        }
        videoRef.current?.addEventListener('canplay', handleCanPlay)
      })
    }

    // Restore playback position
    if (currentTime > 0) {
      videoRef.current.currentTime = currentTime
    }

    // Resume playback if it was playing before
    if (wasPlaying && videoRef.current.paused) {
      try {
        await videoRef.current.play()
      } catch (error) {
        console.warn('Could not resume playback after URL refresh:', error)
      }
    }
  }, [videoRef, state.playbackState])

  // Handle signed URL refresh with seamless playback
  const handleUrlRefresh = useCallback(
    async (movieId: string, isProactive: boolean = true): Promise<void> => {
      if (!signedUrlServiceRef.current || !isMountedRef.current) {
        return
      }

      // Prevent multiple simultaneous refresh attempts
      if (state.isRefreshing) {
        return
      }

      setState((prev) => ({
        ...prev,
        isRefreshing: true,
        refreshAttempts: prev.refreshAttempts + 1,
      }))

      try {
        // Save current playback state for seamless transition
        savePlaybackState()

        const response = await signedUrlServiceRef.current.refreshSignedUrl(movieId)

        if (!isMountedRef.current) return

        setState((prev) => ({
          ...prev,
          signedUrl: response.streamUrl,
          urlExpiresAt: response.expiresAt,
          error: null,
          lastRefreshTime: Date.now(),
          refreshAttempts: 0, // Reset attempts on success
        }))

        // Update video source seamlessly
        if (videoRef.current && response.streamUrl) {
          const wasPlaying = !videoRef.current.paused
          videoRef.current.src = response.streamUrl

          // For seamless playback, restore state after source change
          if (wasPlaying || state.playbackState.wasPlaying) {
            videoRef.current.addEventListener('loadeddata', restorePlaybackState, { once: true })
          }
        }

        // Schedule next proactive refresh
        if (signedUrlServiceRef.current) {
          const timer = signedUrlServiceRef.current.scheduleRefresh(
            movieId,
            response.expiresAt,
            () => handleUrlRefresh(movieId, true)
          )

          setState((prev) => ({
            ...prev,
            refreshTimer: timer,
          }))
        }

        console.log(`Successfully refreshed signed URL for movie ${movieId} (${isProactive ? 'proactive' : 'reactive'})`)
      } catch (error) {
        if (!isMountedRef.current) return

        console.error('Failed to refresh signed URL:', error)

        // Implement exponential backoff for retry attempts
        const maxRetries = 3
        const baseDelay = 1000 // 1 second

        if (state.refreshAttempts < maxRetries) {
          const retryDelay = baseDelay * Math.pow(2, state.refreshAttempts)

          console.log(`Retrying URL refresh in ${retryDelay}ms (attempt ${state.refreshAttempts + 1}/${maxRetries})`)

          setTimeout(() => {
            if (isMountedRef.current) {
              handleUrlRefresh(movieId, false)
            }
          }, retryDelay)
        } else {
          // Max retries exceeded, show error
          if (error instanceof SignedUrlError) {
            handleError(error)
          } else {
            handleError('Failed to refresh video URL after multiple attempts. Please reload the page.')
          }
        }
      } finally {
        if (isMountedRef.current) {
          setState((prev) => ({
            ...prev,
            isRefreshing: false,
          }))
        }
      }
    },
    [videoRef, handleError, state.isRefreshing, state.refreshAttempts, state.playbackState, savePlaybackState, restorePlaybackState]
  )

  // Initialize signed URL
  const initializeSignedUrl = useCallback(async () => {
    if (!src || authLoading) {
      return
    }

    if (!isAuthenticated) {
      handleError('Authentication required to play video content')
      return
    }

    const movieId = extractMovieId(src)
    if (!movieId) {
      handleError('Invalid video source: could not extract movie ID')
      return
    }

    if (!signedUrlServiceRef.current) {
      handleError('Video service not initialized')
      return
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      movieId,
    }))

    try {
      const response = await signedUrlServiceRef.current.getSignedUrl(movieId)

      if (!isMountedRef.current) return

      setState((prev) => ({
        ...prev,
        signedUrl: response.streamUrl,
        urlExpiresAt: response.expiresAt,
        isLoading: false,
        error: null,
      }))

      // Set video source
      if (videoRef.current && response.streamUrl) {
        videoRef.current.src = response.streamUrl
      }

      // Schedule automatic refresh
      const timer = signedUrlServiceRef.current.scheduleRefresh(movieId, response.expiresAt, () =>
        handleUrlRefresh(movieId, true)
      )

      setState((prev) => ({
        ...prev,
        refreshTimer: timer,
      }))
    } catch (error) {
      if (!isMountedRef.current) return

      console.error('Failed to get signed URL:', error)

      if (error instanceof SignedUrlError) {
        handleError(error)
      } else {
        handleError('Failed to load video. Please try again.')
      }
    }
  }, [src, isAuthenticated, authLoading, extractMovieId, videoRef, handleError, handleUrlRefresh])

  // Initialize when component mounts or dependencies change
  useEffect(() => {
    initializeSignedUrl()

    // Cleanup on unmount or src change
    return () => {
      if (state.refreshTimer) {
        clearTimeout(state.refreshTimer)
      }
      if (signedUrlServiceRef.current && state.movieId) {
        signedUrlServiceRef.current.clearRefreshTimer(state.movieId)
      }
    }
  }, [src, isAuthenticated, authLoading])

  // Periodic check for URL expiry (backup mechanism)
  useEffect(() => {
    if (!state.movieId || !state.urlExpiresAt || !signedUrlServiceRef.current) {
      return
    }

    const checkInterval = setInterval(() => {
      if (!signedUrlServiceRef.current || !state.movieId || !state.urlExpiresAt) {
        return
      }

      // Check if URL should be refreshed proactively
      if (signedUrlServiceRef.current.shouldRefresh(state.urlExpiresAt) && !state.isRefreshing) {
        console.log('Periodic check detected URL needs refresh')
        handleUrlRefresh(state.movieId, true)
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(checkInterval)
  }, [state.movieId, state.urlExpiresAt, state.isRefreshing, handleUrlRefresh])

  // Video event handlers
  const handleVideoTimeUpdate = useCallback(() => {
    if (!videoRef.current) return

    const currentTime = videoRef.current.currentTime
    const duration = videoRef.current.duration

    // Update playback state for seamless URL transitions
    setState((prev) => ({
      ...prev,
      playbackState: {
        ...prev.playbackState,
        currentTime,
        paused: videoRef.current?.paused || false,
      },
    }))

    onTimeUpdate?.(currentTime, duration)
  }, [videoRef, onTimeUpdate])

  const handleVideoLoadedMetadata = useCallback(() => {
    onLoadedMetadata?.()
  }, [onLoadedMetadata])

  const handleVideoEnded = useCallback(() => {
    onEnded?.()
  }, [onEnded])

  const handleVideoError = useCallback(
    (event: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const videoElement = event.currentTarget
      const error = videoElement.error

      let errorMessage = 'Video playback error occurred'
      let shouldAttemptRefresh = false

      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback was aborted'
            break
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading video'
            shouldAttemptRefresh = true
            break
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video format is not supported or corrupted'
            // Could be due to expired URL, try refresh once
            shouldAttemptRefresh = state.refreshAttempts === 0
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video source is not supported'
            // Most likely expired URL, attempt refresh
            shouldAttemptRefresh = true
            break
          default:
            errorMessage = `Video error: ${error.message || 'Unknown error'}`
            // For unknown errors, try refresh if URL might be expired
            if (state.urlExpiresAt && Date.now() >= state.urlExpiresAt * 1000) {
              shouldAttemptRefresh = true
            }
        }
      }

      // Check if URL has expired and attempt refresh
      if (state.movieId && shouldAttemptRefresh && !state.isRefreshing) {
        console.log(`Video error detected (${error?.code}), attempting URL refresh...`)
        handleUrlRefresh(state.movieId, false) // Reactive refresh
        return
      }

      // If refresh is not appropriate or has failed, show error
      handleError(errorMessage)
    },
    [state.movieId, state.refreshAttempts, state.urlExpiresAt, state.isRefreshing, handleError, handleUrlRefresh]
  )

  const handleVideoWaiting = useCallback(() => {
    onWaiting?.()
  }, [onWaiting])

  const handleVideoCanPlay = useCallback(() => {
    onCanPlay?.()
  }, [onCanPlay])

  // Render loading state
  if (state.isLoading) {
    return (
      <div className={`flex items-center justify-center bg-black ${className || ''}`}>
        <div className="text-white">Loading video...</div>
      </div>
    )
  }

  // Show refresh indicator when refreshing URL during playback
  const showRefreshIndicator = state.isRefreshing && state.signedUrl

  // Render error state
  if (state.error) {
    return (
      <div className={`flex items-center justify-center bg-black ${className || ''}`}>
        <div className="text-red-400 text-center p-4">
          <div className="mb-2">⚠️ Video Error</div>
          <div className="text-sm">{state.error}</div>
        </div>
      </div>
    )
  }

  // Render video player
  return (
    <div className="relative">
      <video
        ref={videoRef}
        className={className}
        poster={poster}
        autoPlay={autoPlay}
        controls
        onTimeUpdate={handleVideoTimeUpdate}
        onLoadedMetadata={handleVideoLoadedMetadata}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        onWaiting={handleVideoWaiting}
        onCanPlay={handleVideoCanPlay}
      >
        Your browser does not support the video tag.
      </video>
      
      {/* Show refresh indicator when refreshing URL during playback */}
      {showRefreshIndicator && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-1 rounded text-sm">
          Refreshing stream...
        </div>
      )}
    </div>
  )
}
