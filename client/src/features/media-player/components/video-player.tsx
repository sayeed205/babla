/**
 * VideoPlayer Component
 * Vidstack-based video player with full controls and streaming integration
 */

import { MediaPlayer, MediaProvider, Poster, type MediaPlayerInstance } from '@vidstack/react'
import { DefaultVideoLayout, defaultLayoutIcons } from '@vidstack/react/player/layouts/default'
import { useEffect, useRef, useState } from 'react'
import { streamingService } from '../services'
import { useMediaPlayerStore } from '../stores'
import type { MediaItem, MediaSource } from '../types'

// Vidstack CSS is imported globally in styles.css

interface VideoPlayerProps {
  media: MediaItem
  className?: string
}

export function VideoPlayer({ media, className }: VideoPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null)
  const [mediaSource, setMediaSource] = useState<MediaSource | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    setIsFullscreen,
    setIsPictureInPicture,
    setPlaybackRate,
  } = useMediaPlayerStore()

  // Load media source when media changes
  useEffect(() => {
    let isCancelled = false

    const loadMediaSource = async () => {
      if (!media) return

      try {
        setIsLoading(true)
        setError(null)
        setStoreError(null)

        const source = await streamingService.getStreamingUrl(media.id, media.type)

        if (!isCancelled) {
          setMediaSource(source)
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load media'
          setError(errorMessage)
          setStoreError(errorMessage)
          setIsLoading(false)
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
    const handleError = () => {
      const errorMessage = 'Video playback error'
      setError(errorMessage)
      setStoreError(errorMessage)
      setIsLoading(false)
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
  }, [setIsPlaying, setCurrentTime, setDuration, setVolume, setIsLoading, setError, setStoreError])

  // Show error state
  if (error && !mediaSource) {
    return (
      <div className={`flex items-center justify-center bg-black text-white p-8 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Playback Error</h3>
          <p className="text-sm text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
          >
            Retry
          </button>
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
    <MediaPlayer
      ref={playerRef}
      className={className}
      title={media.title}
      src={mediaSource.url}
      crossOrigin
      playsInline
      autoPlay={config.autoplay}
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
  )
}
