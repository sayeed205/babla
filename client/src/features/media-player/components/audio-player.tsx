/**
 * AudioPlayer Component
 * Specialized audio player with music-specific UI and controls
 */

import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react'
import { DefaultAudioLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import { useEffect, useRef, useState } from 'react'
import { useAccessibility } from '../hooks'
import { streamingService } from '../services'
import { useMediaPlayerStore } from '../stores'
import type { MediaPlayerErrorType, MediaSource, MusicMediaItem } from '../types'
import { createStreamingRetryManager, isAuthenticationError, useAuthErrorHandler } from '../utils'

// Vidstack CSS is imported globally in styles.css

interface AudioPlayerProps {
  media: MusicMediaItem
  className?: string
}

export function AudioPlayer({ media, className }: AudioPlayerProps) {
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
        operation: 'audio-playback',
      })
    }
  }

  // Sync player state with store when external actions occur
  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    // Sync play/pause state
    if (playerState.isPlaying && player.paused) {
      player.play()
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
    const handleError = (event: Event) => {
      const target = event.target as HTMLAudioElement
      const mediaError = target.error

      let error: MediaPlayerErrorType

      if (mediaError) {
        switch (mediaError.code) {
          case MediaError.MEDIA_ERR_NETWORK:
            error = {
              id: `network-error-${Date.now()}`,
              category: 'network',
              severity: 'medium',
              message: 'Network error occurred during audio playback',
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
              message: 'Audio format is not supported or corrupted',
              details: 'This audio format cannot be played in your browser',
              timestamp: Date.now(),
              recoverable: false,
              retryable: false,
              supportedFormats: ['MP3', 'OGG', 'WAV', 'AAC'],
            } as any
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            error = {
              id: `format-error-${Date.now()}`,
              category: 'media_format',
              severity: 'high',
              message: 'Audio source is not supported',
              details: 'The audio format or codec is not supported by your browser',
              timestamp: Date.now(),
              recoverable: false,
              retryable: false,
              supportedFormats: ['MP3', 'OGG', 'WAV', 'AAC'],
            } as any
            break
          case MediaError.MEDIA_ERR_ABORTED:
          default:
            error = {
              id: `playback-error-${Date.now()}`,
              category: 'player_library',
              severity: 'medium',
              message: 'Audio playback was interrupted',
              details: 'The audio playback was aborted due to an error',
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
          message: 'An unknown audio playback error occurred',
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
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-lg ${className}`}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Audio Player Error</h3>
          <p className="text-sm text-gray-300 mb-4">
            The audio player encountered an error and will be handled by the error system.
          </p>
        </div>
      </div>
    )
  }

  // Show loading state
  if (!mediaSource) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-lg ${className}`}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
          <p className="text-sm text-gray-300">Loading audio...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`media-player-container bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-lg overflow-hidden ${getAccessibilityClasses()} ${className}`}
      {...getAriaAttributes('player')}
    >
      {/* Album Art and Metadata Section */}
      <div className="flex flex-col md:flex-row p-6 gap-6">
        {/* Album Art */}
        <div className="flex-shrink-0">
          <div className="w-48 h-48 mx-auto md:mx-0 bg-gray-700 rounded-lg overflow-hidden shadow-lg">
            {media.albumArt ? (
              <img
                src={media.albumArt}
                alt={`${media.album || media.title} album art`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to default music icon if album art fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
            ) : null}
            <div
              className={`w-full h-full flex items-center justify-center ${media.albumArt ? 'hidden' : ''}`}
            >
              <svg className="w-20 h-20 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex-1 flex flex-col justify-center text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">{media.title}</h1>
          {media.artist && <p className="text-lg text-gray-300 mb-1">by {media.artist}</p>}
          {media.album && <p className="text-md text-gray-400 mb-4">from {media.album}</p>}

          {/* Additional metadata */}
          <div className="flex flex-wrap gap-4 justify-center md:justify-start text-sm text-gray-400">
            {media.duration && <span>Duration: {formatTime(media.duration)}</span>}
            {media.metadata?.genre && <span>Genre: {media.metadata.genre}</span>}
            {media.metadata?.year && <span>Year: {media.metadata.year}</span>}
          </div>
        </div>
      </div>

      {/* Audio Player */}
      <div className="px-6 pb-6">
        <MediaPlayer
          ref={playerRef}
          className="w-full"
          title={`${media.artist ? `${media.artist} - ` : ''}${media.title}`}
          src={mediaSource.url}
          crossOrigin
          autoPlay={config.autoplay}
          loop={config.loop}
          volume={config.volume}
          muted={playerState.isMuted}
          playbackRate={playerState.playbackRate}
        >
          <MediaProvider />

          <DefaultAudioLayout
            icons={defaultLayoutIcons}
            slots={
              {
                // Custom slots can be added here for additional controls
              }
            }
          />
        </MediaPlayer>
      </div>
    </div>
  )
}

// Helper function to format time duration
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
