import { useAuthStore } from '@/features/auth/stores/auth-store'
import { SignedUrlError, SignedUrlErrorType, SignedUrlService } from '@/lib/signed-url-service'
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
  error: SignedUrlError | null
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
  errorHistory: Array<{
    error: SignedUrlError
    timestamp: number
    context: string
  }>
  recoveryAttempts: number
  lastRecoveryTime: number
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
    errorHistory: [],
    recoveryAttempts: 0,
    lastRecoveryTime: 0,
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

  // Handle errors with comprehensive classification and recovery logic
  const handleError = useCallback(
    (error: string | SignedUrlError, context: string = 'unknown') => {
      const signedUrlError =
        error instanceof SignedUrlError
          ? error
          : new SignedUrlError(SignedUrlErrorType.UNKNOWN, error)

      // Add to error history for debugging and pattern analysis
      const errorEntry = {
        error: signedUrlError,
        timestamp: Date.now(),
        context,
      }

      setState((prev) => ({
        ...prev,
        error: signedUrlError,
        isLoading: false,
        errorHistory: [...prev.errorHistory.slice(-4), errorEntry], // Keep last 5 errors
      }))

      // Log comprehensive error information
      console.error('SignedUrlVideoPlayer Error:', {
        type: signedUrlError.type,
        severity: signedUrlError.severity,
        message: signedUrlError.message,
        userMessage: signedUrlError.userMessage,
        isRetryable: signedUrlError.isRetryable,
        context,
        timestamp: signedUrlError.timestamp,
        originalError: signedUrlError.originalError,
      })

      // Call the error callback with user-friendly message
      onError?.(signedUrlError.userMessage)

      // Attempt automatic recovery for certain error types
      if (signedUrlError.isRetryable && state.movieId && context !== 'recovery') {
        attemptErrorRecovery(signedUrlError, context)
      }
    },
    [onError]
  )

  // Attempt automatic error recovery with exponential backoff
  const attemptErrorRecovery = useCallback(
    (error: SignedUrlError, context: string) => {
      const now = Date.now()
      const timeSinceLastRecovery = now - state.lastRecoveryTime
      const maxRecoveryAttempts = 3
      const minRecoveryInterval = 5000 // 5 seconds

      // Prevent too frequent recovery attempts
      if (timeSinceLastRecovery < minRecoveryInterval) {
        console.log(`Recovery attempt too soon for context: ${context}, skipping`)
        return
      }

      // Check if we've exceeded max recovery attempts
      if (state.recoveryAttempts >= maxRecoveryAttempts) {
        console.log(`Max recovery attempts exceeded for context: ${context}`)
        return
      }

      const recoveryDelay = error.getRetryDelay(state.recoveryAttempts)

      console.log(
        `Attempting automatic recovery for ${error.type} error from ${context} in ${recoveryDelay}ms (attempt ${state.recoveryAttempts + 1}/${maxRecoveryAttempts})`
      )

      setState((prev) => ({
        ...prev,
        recoveryAttempts: prev.recoveryAttempts + 1,
        lastRecoveryTime: now,
      }))

      setTimeout(() => {
        if (!isMountedRef.current || !state.movieId) return

        switch (error.type) {
          case SignedUrlErrorType.NETWORK:
          case SignedUrlErrorType.TIMEOUT:
          case SignedUrlErrorType.PLAYBACK:
            // Attempt URL refresh for network/playback issues
            console.log(`Attempting URL refresh recovery for ${context}`)
            handleUrlRefresh(state.movieId, false)
            break

          case SignedUrlErrorType.SERVER:
            // For server errors, try reinitializing
            console.log(`Attempting reinitialization recovery for ${context}`)
            initializeSignedUrl()
            break

          default:
            console.log(`No recovery strategy for error type: ${error.type} from ${context}`)
        }
      }, recoveryDelay)
    },
    [state.lastRecoveryTime, state.recoveryAttempts, state.movieId]
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
          recoveryAttempts: 0, // Reset recovery attempts on success
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

        console.log(
          `Successfully refreshed signed URL for movie ${movieId} (${isProactive ? 'proactive' : 'reactive'})`
        )
      } catch (error) {
        if (!isMountedRef.current) return

        console.error('Failed to refresh signed URL:', error)

        // Implement exponential backoff for retry attempts
        const maxRetries = 3
        const baseDelay = 1000 // 1 second

        if (state.refreshAttempts < maxRetries) {
          const retryDelay = baseDelay * Math.pow(2, state.refreshAttempts)

          console.log(
            `Retrying URL refresh in ${retryDelay}ms (attempt ${state.refreshAttempts + 1}/${maxRetries})`
          )

          setTimeout(() => {
            if (isMountedRef.current) {
              handleUrlRefresh(movieId, false)
            }
          }, retryDelay)
        } else {
          // Max retries exceeded, show error
          if (error instanceof SignedUrlError) {
            handleError(error, 'url_refresh_max_retries')
          } else {
            const maxRetriesError = new SignedUrlError(
              SignedUrlErrorType.NETWORK,
              'Failed to refresh video URL after multiple attempts',
              error instanceof Error ? error : undefined,
              'Unable to refresh video stream. Please reload the page.'
            )
            handleError(maxRetriesError, 'url_refresh_max_retries')
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
    [
      videoRef,
      handleError,
      state.isRefreshing,
      state.refreshAttempts,
      state.playbackState,
      savePlaybackState,
      restorePlaybackState,
    ]
  )

  // Initialize signed URL
  const initializeSignedUrl = useCallback(async () => {
    if (!src || authLoading) {
      return
    }

    if (!isAuthenticated) {
      const authError = new SignedUrlError(
        SignedUrlErrorType.AUTHENTICATION,
        'User not authenticated',
        undefined,
        'Please log in to watch video content.'
      )
      handleError(authError, 'initialization')
      return
    }

    const movieId = extractMovieId(src)
    if (!movieId) {
      const validationError = new SignedUrlError(
        SignedUrlErrorType.VALIDATION,
        'Could not extract movie ID from source',
        undefined,
        'Invalid video source. Please contact support if this persists.'
      )
      handleError(validationError, 'initialization')
      return
    }

    if (!signedUrlServiceRef.current) {
      const serviceError = new SignedUrlError(
        SignedUrlErrorType.UNKNOWN,
        'Video service not initialized',
        undefined,
        'Video player initialization failed. Please refresh the page.'
      )
      handleError(serviceError, 'initialization')
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
        recoveryAttempts: 0, // Reset recovery attempts on successful initialization
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
        handleError(error, 'initialization')
      } else {
        const initError = new SignedUrlError(
          SignedUrlErrorType.UNKNOWN,
          'Failed to initialize video player',
          error instanceof Error ? error : undefined,
          'Failed to load video. Please try again.'
        )
        handleError(initError, 'initialization')
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
      const playbackError = new SignedUrlError(
        SignedUrlErrorType.PLAYBACK,
        errorMessage,
        undefined,
        'Video playback error occurred. Please try again.'
      )
      handleError(playbackError, 'video_playback')
    },
    [
      state.movieId,
      state.refreshAttempts,
      state.urlExpiresAt,
      state.isRefreshing,
      handleError,
      handleUrlRefresh,
    ]
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

  // Render error state with enhanced user experience
  if (state.error) {
    const canRetry = state.error.isRetryable && state.recoveryAttempts < 3
    const isRecovering = state.recoveryAttempts > 0 && canRetry

    return (
      <div className={`flex items-center justify-center bg-black ${className || ''}`}>
        <div className="text-center p-6 max-w-md">
          {/* Error icon based on severity */}
          <div className="mb-4 text-4xl">
            {state.error.severity === 'critical'
              ? '🚨'
              : state.error.severity === 'high'
                ? '⚠️'
                : state.error.severity === 'medium'
                  ? '⚡'
                  : '💭'}
          </div>

          {/* Error title */}
          <div className="text-white font-semibold mb-2">
            {state.error.type === SignedUrlErrorType.AUTHENTICATION
              ? 'Authentication Required'
              : state.error.type === SignedUrlErrorType.NETWORK
                ? 'Connection Issue'
                : state.error.type === SignedUrlErrorType.SERVER
                  ? 'Server Unavailable'
                  : state.error.type === SignedUrlErrorType.PLAYBACK
                    ? 'Playback Error'
                    : state.error.type === SignedUrlErrorType.VALIDATION
                      ? 'Invalid Content'
                      : 'Video Error'}
          </div>

          {/* User-friendly error message */}
          <div className="text-gray-300 text-sm mb-4">{state.error.userMessage}</div>

          {/* Recovery status */}
          {isRecovering && (
            <div className="text-blue-400 text-xs mb-3">
              Attempting to recover... (attempt {state.recoveryAttempts}/3)
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 justify-center">
            {canRetry && !isRecovering && (
              <button
                onClick={() => state.movieId && initializeSignedUrl()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                Try Again
              </button>
            )}

            {state.error.type === SignedUrlErrorType.AUTHENTICATION && (
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
              >
                Refresh Page
              </button>
            )}
          </div>

          {/* Technical details for debugging (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-gray-500 cursor-pointer">Technical Details</summary>
              <div className="text-xs text-gray-400 mt-2 font-mono">
                <div>Type: {state.error.type}</div>
                <div>Severity: {state.error.severity}</div>
                <div>Retryable: {state.error.isRetryable ? 'Yes' : 'No'}</div>
                <div>Timestamp: {new Date(state.error.timestamp).toLocaleString()}</div>
                {state.error.originalError && (
                  <div>Original: {state.error.originalError.message}</div>
                )}
              </div>
            </details>
          )}
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
