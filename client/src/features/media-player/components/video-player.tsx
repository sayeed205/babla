/**
 * VideoPlayer Component
 * Vidstack-based video player with full controls and streaming integration
 */

import { MediaPlayer, MediaProvider, Poster, type MediaPlayerInstance } from '@vidstack/react'
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import { useEffect, useRef, useState } from 'react'
import { useAccessibility } from '../hooks'
import { streamingService } from '../services'
import { useMediaPlayerStore } from '../stores'
import type { MediaItem, MediaPlayerErrorType, MediaSource } from '../types'
import { createStreamingRetryManager, isAuthenticationError, useAuthErrorHandler } from '../utils'

// Vidstack CSS is imported globally in styles.css

interface VideoPlayerProps {
  media: MediaItem
  className?: string
}

export function VideoPlayer({ media, className }: VideoPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null)
  const containerRef = useRef<HTMLDivElement>(null!)
  const [mediaSource, setMediaSource] = useState<MediaSource | null>(null)
  const [localError, setLocalError] = useState<MediaPlayerErrorType | null>(null)
  const retryManager = useRef(createStreamingRetryManager())
  const { handleAuthError } = useAuthErrorHandler()

  // Accessibility features
  const { getAriaAttributes, getAccessibilityClasses } = useAccessibility(containerRef)

  // Store actions and state
  const {
    playerState,
    config,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsLoading,
    setError: setStoreError,
  } = useMediaPlayerStore()

  // Load media source when media changes
  useEffect(() => {
    let isCancelled = false

    const loadMediaSource = async () => {
      if (!media) return

      try {
        setIsLoading(true)
        setLocalError(null)
        setStoreError(null)

        // Use retry manager for loading media source
        const result = await retryManager.current.executeWithRetry('STREAM_URL_FETCH', () =>
          streamingService.getStreamingUrl(media.id, media.type)
        )

        if (!isCancelled) {
          if (result.success && result.result) {
            setMediaSource(result.result)
            setIsLoading(false)
          } else if (result.error) {
            await handleMediaError(result.error)
          }
        }
      } catch (err) {
        if (!isCancelled) {
          const error = err as MediaPlayerErrorType
          await handleMediaError(error)
        }
      }
    }

    loadMediaSource()

    return () => {
      isCancelled = true
      // Cleanup streaming session when component unmounts or media changes
      streamingService.cleanupSession(media.id, media.type)
    }
  }, [media, setIsLoading, setStoreError])

  // Handle media errors with appropriate recovery strategies
  const handleMediaError = async (error: MediaPlayerErrorType) => {
    setLocalError(error)
    setStoreError(error)
    setIsLoading(false)

    // Handle authentication errors specially
    if (isAuthenticationError(error)) {
      await handleAuthError(error, {
        mediaId: media.id,
        mediaType: media.type,
        operation: 'video-playback',
      })
    }
  }

  // Sync player state with store when external actions occur
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    // Sync play/pause state
    if (playerState.isPlaying && player.paused) {
      player.play().catch((error) => {
        console.error('Failed to start playback:', error)
        setIsPlaying(false)
      })
    } else if (!playerState.isPlaying && !player.paused) {
      player.pause()
    }

    // Sync volume
    if (Math.abs(player.volume - playerState.volume) > 0.01) {
      player.volume = playerState.volume
    }

    // Sync muted state
    if (player.muted !== playerState.isMuted) {
      player.muted = playerState.isMuted
    }

    // Sync current time (for seeking)
    if (Math.abs(player.currentTime - playerState.currentTime) > 1) {
      player.currentTime = playerState.currentTime
    }

    // Sync playback rate
    if (player.playbackRate !== playerState.playbackRate) {
      player.playbackRate = playerState.playbackRate
    }
  }, [playerState])

  // Setup player event listeners
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => setCurrentTime(player.currentTime)
    const handleDurationChange = () => setDuration(player.duration)
    const handleVolumeChange = () => setVolume(player.volume)
    const handleSeeking = () => setIsLoading(true)
    const handleSeeked = () => setIsLoading(false)
    const handleLoadStart = () => setIsLoading(true)
    const handleLoadedData = () => setIsLoading(false)
    const handleCanPlay = () => {
      setIsLoading(false)
      // Now that media is ready, we can start playback if requested
      if (playerState.isPlaying && player.paused) {
        player.play().catch((error) => {
          console.error('Failed to start playback:', error)
          setIsPlaying(false)
        })
      }
    }
    const handleError = (event: Event) => {
      const target = event.target as HTMLVideoElement
      const mediaError = target.error

      let error: MediaPlayerErrorType

      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_NETWORK:
            error = {
              id: `network-error-${Date.now()}`,
              category: 'network',
              severity: 'medium',
              message: 'Network error occurred during video playback',
              details: 'Check your internet connection and try again',
              timestamp: Date.now(),
              recoverable: true,
              retryable: true,
            }
            break
          case MediaError.MEDIA_ERR_DECODE:
            error = {
              id: `decode-error-${Date.now()}`,
              category: 'media_format',
              severity: 'high',
              message: 'Video format is not supported or corrupted',
              details: 'This video format cannot be played in your browser',
              timestamp: Date.now(),
              recoverable: false,
              retryable: false,
              supportedFormats: ['MP4', 'WebM', 'OGV'],
            } as any
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            error = {
              id: `format-error-${Date.now()}`,
              category: 'media_format',
              severity: 'high',
              message: 'Video source is not supported',
              details: 'The video format or codec is not supported by your browser',
              timestamp: Date.now(),
              recoverable: false,
              retryable: false,
              supportedFormats: ['MP4', 'WebM', 'OGV'],
            } as any
            break
          case MediaError.MEDIA_ERR_ABORTED:
          default:
            error = {
              id: `playback-error-${Date.now()}`,
              category: 'player_library',
              severity: 'medium',
              message: 'Video playback was interrupted',
              details: 'The video playback was aborted due to an error',
              timestamp: Date.now(),
              recoverable: true,
              retryable: true,
              libraryName: 'Vidstack',
              libraryVersion: '1.0.0',
            }
            break
        }
      } else {
        error = {
          id: `unknown-error-${Date.now()}`,
          category: 'network',
          severity: 'medium',
          message: 'An unknown video playback error occurred',
          timestamp: Date.now(),
          recoverable: true,
          retryable: true,
        }
      }

      handleMediaError(error)
    }
    const handleEnded = () => setIsPlaying(false)

    // Add event listeners
    player.addEventListener('play', handlePlay)
    player.addEventListener('pause', handlePause)
    player.addEventListener('timeupdate', handleTimeUpdate)
    player.addEventListener('durationchange', handleDurationChange)
    player.addEventListener('volumechange', handleVolumeChange)
    player.addEventListener('seeking', handleSeeking)
    player.addEventListener('seeked', handleSeeked)
    player.addEventListener('loadstart', handleLoadStart)
    player.addEventListener('loadeddata', handleLoadedData)
    player.addEventListener('can-play', handleCanPlay)
    player.addEventListener('error', handleError)
    player.addEventListener('ended', handleEnded)

    return () => {
      // Cleanup event listeners
      player.removeEventListener('play', handlePlay)
      player.removeEventListener('pause', handlePause)
      player.removeEventListener('timeupdate', handleTimeUpdate)
      player.removeEventListener('durationchange', handleDurationChange)
      player.removeEventListener('volumechange', handleVolumeChange)
      player.removeEventListener('seeking', handleSeeking)
      player.removeEventListener('seeked', handleSeeked)
      player.removeEventListener('loadstart', handleLoadStart)
      player.removeEventListener('loadeddata', handleLoadedData)
      player.removeEventListener('can-play', handleCanPlay)
      player.removeEventListener('error', handleError)
      player.removeEventListener('ended', handleEnded)
    }
  }, [
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setIsLoading,
    setStoreError,
    handleMediaError,
  ])

  // Show error state - errors are now handled by the overlay component
  if (localError && !mediaSource) {
    return (
      <div className={`flex items-center justify-center bg-black text-white p-8 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Video Player Error</h3>
          <p className="text-sm text-gray-300 mb-4">
            The video player encountered an error and will be handled by the error system.
          </p>
        </div>
      </div>
    )
  }

  // Show loading state
  if (!mediaSource) {
    return (
      <div className={`flex items-center justify-center bg-black text-white p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-sm text-gray-300">Loading video...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`media-player-container ${getAccessibilityClasses()}`}
      {...getAriaAttributes('player')}
    >
      <MediaPlayer
        ref={playerRef}
        className={className}
        title={media.title}
        src={{
          src: mediaSource.url,
          type: 'video/mp4',
        }}
        crossOrigin
        playsInline
        autoPlay={false} // Disable autoplay to prevent premature play attempts
        loop={config.loop}
        volume={config.volume}
        muted={playerState.isMuted}
        playbackRate={playerState.playbackRate}
      >
        <MediaProvider>
          {media.thumbnail && (
            <Poster className="vds-poster" src={media.thumbnail} alt={`${media.title} poster`} />
          )}
        </MediaProvider>

        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails={media.thumbnail}
          slots={
            {
              // Custom slots can be added here for additional controls
            }
          }
        />
      </MediaPlayer>
    </div>
  )
}
