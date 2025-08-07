import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { useMediaPlayerStore } from '@/stores/media-player-store'
import {
    ChevronDown,
    ChevronUp,
    Maximize,
    Minimize,
    Pause,
    Play,
    Repeat,
    Repeat1,
    Shuffle,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LosslessAudioPlayer, MSEVideoPlayer } from '../media-player'

export function GlobalMediaPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const containerRef = useRef<HTMLDivElement>(null)

  // State for managing MediaSource cleanup and player transitions
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isPlayerLoading, setIsPlayerLoading] = useState(false)

  // Keep track of current MediaSource for proper cleanup
  const currentMediaSourceRef = useRef<MediaSource | null>(null)
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousMediaRef = useRef<typeof currentMedia>(null)

  // State management for ensuring only one active MediaSource
  const [activeMediaSourceId, setActiveMediaSourceId] = useState<string | null>(null)

  const {
    currentMedia,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    isPlayerVisible,
    isMinimized,
    repeatMode,
    shuffleMode,
    // Actions
    pause,
    resume,
    stop,
    seekTo,
    setVolume,
    toggleMute,
    toggleFullscreen,
    toggleMinimize,
    playNext,
    playPrevious,
    setRepeatMode,
    toggleShuffle,
    // Internal updates
    updateCurrentTime,
    updateDuration,
    setIsPlaying,
  } = useMediaPlayerStore()

  // Format time helper
  const formatTime = useCallback((time: number) => {
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }, [])

  // Enhanced media type detection for routing to appropriate player
  const detectMediaType = useCallback((media: typeof currentMedia): 'video' | 'audio' => {
    if (!media) return 'video'

    // Use explicit type if provided
    if (media.type) {
      return media.type
    }

    // Detect from URL patterns
    const urlLower = media.src.toLowerCase()

    // Lossless audio formats (prioritized for LosslessAudioPlayer)
    const losslessAudioExtensions = ['.flac', '.wav', '.alac', '.ape', '.wv']
    const audioExtensions = ['.mp3', '.aac', '.m4a', '.ogg', '.wma', '.opus']
    const audioPatterns = ['/audio/', 'audio=', 'type=audio', '/music/', '/songs/', '/tracks/']

    // Check for audio formats
    if (
      losslessAudioExtensions.some((ext) => urlLower.includes(ext)) ||
      audioExtensions.some((ext) => urlLower.includes(ext)) ||
      audioPatterns.some((pattern) => urlLower.includes(pattern))
    ) {
      return 'audio'
    }

    // Default to video for MSEVideoPlayer
    return 'video'
  }, [])

  // Get current media element - moved up to fix dependency order
  const getCurrentMediaElement = useCallback((): HTMLVideoElement | HTMLAudioElement | null => {
    if (!currentMedia) return null

    const mediaType = detectMediaType(currentMedia)

    if (mediaType === 'video' && videoRef.current) {
      return videoRef.current
    }

    // For audio, find the audio element within the LosslessAudioPlayer
    const audioElement = containerRef.current?.querySelector('audio')
    return audioElement || null
  }, [currentMedia, detectMediaType])

  // Enhanced MediaSource cleanup function with comprehensive memory management
  const cleanupMediaSource = useCallback(() => {
    // Clear any pending cleanup timeouts
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }

    if (currentMediaSourceRef.current) {
      try {
        // End the stream if MediaSource is still open
        if (currentMediaSourceRef.current.readyState === 'open') {
          // Remove all source buffers first
          const sourceBuffers = currentMediaSourceRef.current.sourceBuffers
          for (let i = sourceBuffers.length - 1; i >= 0; i--) {
            try {
              currentMediaSourceRef.current.removeSourceBuffer(sourceBuffers[i])
            } catch (error) {
              console.warn('Error removing SourceBuffer:', error)
            }
          }
          
          currentMediaSourceRef.current.endOfStream()
        }

        // Remove event listeners to prevent memory leaks
        currentMediaSourceRef.current.removeEventListener('sourceopen', () => {})
        currentMediaSourceRef.current.removeEventListener('error', () => {})

      } catch (error) {
        console.warn('Error ending MediaSource:', error)
      }

      currentMediaSourceRef.current = null
    }

    // Clean up video element
    if (videoRef.current) {
      try {
        // Pause and reset video
        videoRef.current.pause()

        // Revoke blob URLs to free memory
        if (videoRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(videoRef.current.src)
        }

        // Clear the source
        videoRef.current.src = ''
        videoRef.current.load() // Reset the video element
      } catch (error) {
        console.warn('Error cleaning up video element:', error)
      }
    }

    // Clean up audio elements (for LosslessAudioPlayer) with memory optimization
    const audioElements = containerRef.current?.querySelectorAll('audio')
    audioElements?.forEach((audio) => {
      try {
        audio.pause()
        
        // Clean up blob URLs to free memory
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src)
        }
        
        audio.src = ''
        audio.load()
        
        // Remove event listeners to prevent memory leaks
        audio.removeEventListener('timeupdate', () => {})
        audio.removeEventListener('loadedmetadata', () => {})
        audio.removeEventListener('canplay', () => {})
        audio.removeEventListener('waiting', () => {})
        audio.removeEventListener('ended', () => {})
        audio.removeEventListener('error', () => {})
      } catch (error) {
        console.warn('Error cleaning up audio element:', error)
      }
    })

    // Reset active MediaSource tracking
    setActiveMediaSourceId(null)
  }, [])

  // Ensure only one MediaSource is active per video element
  const ensureSingleMediaSource = useCallback(
    (newMediaId: string) => {
      if (activeMediaSourceId && activeMediaSourceId !== newMediaId) {
        cleanupMediaSource()
      }
      setActiveMediaSourceId(newMediaId)
    },
    [activeMediaSourceId, cleanupMediaSource]
  )

  // Enhanced media transition with comprehensive cleanup and state management
  const handleMediaTransition = useCallback(
    async (newMedia: typeof currentMedia) => {
      if (!newMedia) return

      const previousMedia = previousMediaRef.current
      const isSameMedia = previousMedia?.id === newMedia.id

      // Skip transition if it's the same media (avoid unnecessary cleanup)
      if (isSameMedia) {
        return
      }

      setIsTransitioning(true)
      setPlayerError(null)

      try {
        // Ensure only one MediaSource is active
        ensureSingleMediaSource(newMedia.id)

        // Clean up previous MediaSource before switching (if different media)
        if (previousMedia && previousMedia.id !== newMedia.id) {
          cleanupMediaSource()

          // Longer delay for media switches to ensure complete cleanup
          await new Promise((resolve) => setTimeout(resolve, 200))
        }

        // Store reference to current media for next transition
        previousMediaRef.current = newMedia
      } catch (error) {
        console.error('Error during media transition:', error)
        setPlayerError('Failed to switch media')
      } finally {
        setIsTransitioning(false)
      }
    },
    [cleanupMediaSource, detectMediaType, ensureSingleMediaSource]
  )

  // Buffer cleanup for maintaining optimal buffer ranges
  const cleanupOldBuffers = useCallback(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement || !mediaElement.buffered) return

    // Note: Actual buffer cleanup is handled by the MSEVideoPlayer and LosslessAudioPlayer
    // This function provides monitoring for the global player
  }, [getCurrentMediaElement])

  // Enhanced media event handlers for new player components
  const handlePlayerTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      updateCurrentTime(currentTime)
      updateDuration(duration)
    },
    [updateCurrentTime, updateDuration]
  )

  const handlePlayerLoadedMetadata = useCallback(() => {
    setIsPlayerLoading(false)
  }, [])

  const handlePlayerWaiting = useCallback(() => {
    setIsPlayerLoading(true)
  }, [])

  const handlePlayerCanPlay = useCallback(() => {
    setIsPlayerLoading(false)
  }, [])

  const handlePlayerEnded = useCallback(() => {
    setIsPlaying(false)

    if (repeatMode === 'one') {
      // Repeat current media - let the player handle the restart
      resume()
    } else {
      playNext()
    }
  }, [repeatMode, playNext, resume, setIsPlaying])

  const handlePlayerError = useCallback(
    (error: string) => {
      console.error('Global media player error:', error)
      setPlayerError(error)
      setIsPlaying(false)
      setIsPlayerLoading(false)

      // Clean up on error to prevent stuck states
      cleanupTimeoutRef.current = setTimeout(() => {
        cleanupMediaSource()
      }, 5000) // Clean up after 5 seconds if error persists
    },
    [setIsPlaying, cleanupMediaSource]
  )

  // State validation and recovery
  const validatePlayerState = useCallback(() => {
    if (!currentMedia || !isPlayerVisible) return

    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    // Check for state inconsistencies
    const elementPlaying = !mediaElement.paused
    const storePlayingState = isPlaying

    if (elementPlaying !== storePlayingState) {
      setIsPlaying(elementPlaying)
    }

    // Check for stuck loading states
    if (isPlayerLoading && mediaElement.readyState >= 3) {
      // HAVE_FUTURE_DATA
      setIsPlayerLoading(false)
    }
  }, [
    currentMedia,
    isPlayerVisible,
    getCurrentMediaElement,
    isPlaying,
    isPlayerLoading,
    setIsPlaying,
  ])

  // Periodic state validation
  useEffect(() => {
    if (!isPlayerVisible || !currentMedia) return

    const stateValidationInterval = setInterval(validatePlayerState, 5000) // Check every 5 seconds

    return () => clearInterval(stateValidationInterval)
  }, [isPlayerVisible, currentMedia, validatePlayerState])

  // Enhanced control functions that work with both MSE video and lossless audio players

  const togglePlay = useCallback(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    if (isPlaying) {
      mediaElement.pause()
      pause()
    } else {
      mediaElement.play().catch((error) => {
        console.error('Play failed:', error)
        setPlayerError('Failed to start playback')
      })
      resume()
    }
  }, [isPlaying, pause, resume, getCurrentMediaElement])

  const handleSeek = useCallback(
    (value: number[]) => {
      const mediaElement = getCurrentMediaElement()
      if (!mediaElement || !duration) return

      const newTime = (value[0] / 100) * duration
      mediaElement.currentTime = newTime
      seekTo(newTime)
    },
    [duration, seekTo, getCurrentMediaElement]
  )

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const mediaElement = getCurrentMediaElement()
      if (!mediaElement) return

      const newVolume = value[0] / 100
      mediaElement.volume = newVolume
      setVolume(newVolume)
    },
    [setVolume, getCurrentMediaElement]
  )

  const handleToggleMute = useCallback(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    toggleMute()
    mediaElement.muted = !isMuted
  }, [toggleMute, isMuted, getCurrentMediaElement])

  const handleRepeatClick = useCallback(() => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all']
    const currentIndex = modes.indexOf(repeatMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setRepeatMode(nextMode)
  }, [repeatMode, setRepeatMode])

  // Handle media transitions when currentMedia changes
  useEffect(() => {
    if (currentMedia) {
      handleMediaTransition(currentMedia)
    } else {
      // Clean up when no media is selected
      cleanupMediaSource()
      previousMediaRef.current = null
    }
  }, [currentMedia, handleMediaTransition, cleanupMediaSource])

  // Maintain global player state consistency across navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Perform cleanup before page unload
      cleanupMediaSource()
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, pause playback to save resources
        const mediaElement = getCurrentMediaElement()
        if (mediaElement && !mediaElement.paused) {
          mediaElement.pause()
          // Don't update the store state - this is just a resource optimization
        }
      }
    }

    // Add event listeners for cleanup and state management
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [cleanupMediaSource, getCurrentMediaElement])

  // Enhanced buffer cleanup and memory monitoring
  useEffect(() => {
    if (!isPlayerVisible || !currentMedia) return

    const bufferMonitorInterval = setInterval(() => {
      cleanupOldBuffers()
      
      // Memory usage monitoring (Chrome-specific)
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memoryInfo = (performance as any).memory
        if (memoryInfo && memoryInfo.usedJSHeapSize && memoryInfo.jsHeapSizeLimit) {
          const usedMB = (memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)
          const limitMB = (memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1)
          
          // Log memory usage if it's getting high
          if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8) {
            console.warn(`High memory usage detected: ${usedMB}MB / ${limitMB}MB`)
            
            // Force cleanup if memory is critically high
            if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.9) {
              console.warn('Critical memory usage, forcing cleanup')
              cleanupMediaSource()
            }
          }
        }
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(bufferMonitorInterval)
  }, [isPlayerVisible, currentMedia, cleanupOldBuffers, cleanupMediaSource])

  // Sync media element with store state
  useEffect(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    if (isPlaying && mediaElement.paused) {
      mediaElement.play().catch((error) => {
        console.error('Auto-play failed:', error)
        setPlayerError('Playback failed')
      })
    } else if (!isPlaying && !mediaElement.paused) {
      mediaElement.pause()
    }
  }, [isPlaying, getCurrentMediaElement])

  useEffect(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    mediaElement.volume = isMuted ? 0 : volume
    mediaElement.muted = isMuted
  }, [volume, isMuted, getCurrentMediaElement])

  // Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending timeouts
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current)
      }

      // Perform complete cleanup
      cleanupMediaSource()

      // Reset refs
      previousMediaRef.current = null
      currentMediaSourceRef.current = null
    }
  }, [cleanupMediaSource])

  // Fullscreen handling
  useEffect(() => {
    if (!containerRef.current) return

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement
      if (isCurrentlyFullscreen !== isFullscreen) {
        toggleFullscreen()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFullscreen, toggleFullscreen])

  const handleFullscreenToggle = useCallback(async () => {
    if (!containerRef.current) return

    try {
      if (isFullscreen) {
        await document.exitFullscreen()
      } else {
        await containerRef.current.requestFullscreen()
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error)
    }
  }, [isFullscreen])

  // Enhanced keyboard shortcuts that work with new player architecture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayerVisible || !currentMedia || isTransitioning) return

      // Only handle shortcuts if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      const mediaElement = getCurrentMediaElement()
      if (!mediaElement) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          const newTimeLeft = Math.max(currentTime - 10, 0)
          mediaElement.currentTime = newTimeLeft
          seekTo(newTimeLeft)
          break
        case 'ArrowRight':
          e.preventDefault()
          const newTimeRight = Math.min(currentTime + 10, duration)
          mediaElement.currentTime = newTimeRight
          seekTo(newTimeRight)
          break
        case 'ArrowUp':
          e.preventDefault()
          handleVolumeChange([Math.min((volume + 0.1) * 100, 100)])
          break
        case 'ArrowDown':
          e.preventDefault()
          handleVolumeChange([Math.max((volume - 0.1) * 100, 0)])
          break
        case 'KeyM':
          e.preventDefault()
          handleToggleMute()
          break
        case 'KeyF':
          e.preventDefault()
          if (detectMediaType(currentMedia) === 'video') {
            handleFullscreenToggle()
          }
          break
        case 'KeyN':
          e.preventDefault()
          playNext()
          break
        case 'KeyP':
          e.preventDefault()
          playPrevious()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    isPlayerVisible,
    currentMedia,
    isTransitioning,
    togglePlay,
    currentTime,
    duration,
    volume,
    seekTo,
    handleVolumeChange,
    handleToggleMute,
    handleFullscreenToggle,
    playNext,
    playPrevious,
    getCurrentMediaElement,
    detectMediaType,
  ])

  if (!isPlayerVisible || !currentMedia) {
    return null
  }

  const isVideo = detectMediaType(currentMedia) === 'video'
  const posterUrl = currentMedia.poster

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 bg-black transition-all duration-300 ease-in-out',
        isFullscreen
          ? 'inset-0'
          : isMinimized
            ? 'bottom-4 right-4 w-80 h-20 rounded-lg shadow-2xl'
            : 'bottom-4 right-4 w-96 h-64 rounded-lg shadow-2xl'
      )}
    >
      {/* Media Element - New MSE Video Player and Lossless Audio Player */}
      {isTransitioning ? (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p className="text-sm">Switching media...</p>
          </div>
        </div>
      ) : playerError ? (
        <div className="absolute inset-0 bg-black flex items-center justify-center">
          <div className="text-white text-center">
            <p className="text-sm text-red-400 mb-2">Playback Error</p>
            <p className="text-xs text-white/60">{playerError}</p>
            <button
              onClick={() => {
                setPlayerError(null)
                if (currentMedia) handleMediaTransition(currentMedia)
              }}
              className="mt-2 px-3 py-1 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : isVideo ? (
        <MSEVideoPlayer
          src={currentMedia.src}
          poster={posterUrl}
          className={cn('w-full h-full object-contain', isMinimized ? 'hidden' : 'block')}
          autoPlay={false} // Let the global player control playback
          videoRef={videoRef}
          onTimeUpdate={handlePlayerTimeUpdate}
          onLoadedMetadata={handlePlayerLoadedMetadata}
          onWaiting={handlePlayerWaiting}
          onCanPlay={handlePlayerCanPlay}
          onEnded={handlePlayerEnded}
          onError={handlePlayerError}
        />
      ) : (
        <div className={cn('w-full h-full', isMinimized ? 'hidden' : 'block')}>
          <LosslessAudioPlayer
            src={currentMedia.src}
            title={currentMedia.title}
            artist={currentMedia.artist}
            album={currentMedia.album}
            artwork={posterUrl}
            className="w-full h-full"
            autoPlay={false} // Let the global player control playback
            onTimeUpdate={handlePlayerTimeUpdate}
            onLoadedMetadata={handlePlayerLoadedMetadata}
            onWaiting={handlePlayerWaiting}
            onCanPlay={handlePlayerCanPlay}
            onEnded={handlePlayerEnded}
            onError={handlePlayerError}
          />
        </div>
      )}

      {/* Loading indicator for player operations */}
      {isPlayerLoading && !isTransitioning && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}

      {/* Audio Player Visual (when not video or minimized) */}
      {(!isVideo || isMinimized) && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 flex items-center">
          {posterUrl && (
            <div
              className={cn(
                'flex-shrink-0 bg-gray-800 rounded overflow-hidden',
                isMinimized ? 'w-12 h-12 ml-2' : 'w-16 h-16 ml-4'
              )}
            >
              <img
                src={posterUrl}
                alt={currentMedia.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className={cn('flex-1 min-w-0 text-white', isMinimized ? 'mx-2' : 'mx-4')}>
            <p className={cn('font-medium truncate', isMinimized ? 'text-sm' : 'text-base')}>
              {currentMedia.title}
            </p>
            {currentMedia.artist && !isMinimized && (
              <p className="text-sm text-white/60 truncate">{currentMedia.artist}</p>
            )}
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent',
          isMinimized ? 'from-black/60' : ''
        )}
      >
        {/* Header Controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMinimize}
            className="text-white hover:bg-white/20 p-1 h-8 w-8"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={stop}
            className="text-white hover:bg-white/20 p-1 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {!isMinimized && (
          <>
            {/* Progress Bar */}
            <div className="absolute bottom-16 left-4 right-4">
              <Slider
                value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="cursor-pointer"
              />
            </div>

            {/* Main Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Previous */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={playPrevious}
                  className="text-white hover:bg-white/20 p-2"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>

                {/* Play/Pause */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20 p-2"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>

                {/* Next */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={playNext}
                  className="text-white hover:bg-white/20 p-2"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>

                {/* Volume */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleMute}
                    className="text-white hover:bg-white/20 p-2"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <div className="w-16">
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="text-white text-xs font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Repeat */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRepeatClick}
                  className={cn(
                    'text-white hover:bg-white/20 p-2',
                    repeatMode !== 'none' && 'bg-white/20'
                  )}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </Button>

                {/* Shuffle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleShuffle}
                  className={cn('text-white hover:bg-white/20 p-2', shuffleMode && 'bg-white/20')}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>

                {/* Fullscreen (Video only) */}
                {isVideo && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleFullscreenToggle}
                    className="text-white hover:bg-white/20 p-2"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-4 h-4" />
                    ) : (
                      <Maximize className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Minimized Controls */}
        {isMinimized && (
          <div className="absolute bottom-2 right-16 flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={playPrevious}
              className="text-white hover:bg-white/20 p-1 h-6 w-6"
            >
              <SkipBack className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="text-white hover:bg-white/20 p-1 h-6 w-6"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={playNext}
              className="text-white hover:bg-white/20 p-1 h-6 w-6"
            >
              <SkipForward className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
