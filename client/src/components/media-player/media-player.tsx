import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
    Cast,
    Download,
    Loader2,
    Maximize,
    Minimize,
    Pause,
    PictureInPicture,
    Play,
    Settings,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LosslessAudioPlayer, MSEVideoPlayer } from './index'

interface MediaPlayerProps {
  src: string
  title?: string
  poster?: string
  type?: 'video' | 'audio'
  className?: string
  autoPlay?: boolean
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  // Additional props for audio content
  artist?: string
  album?: string
  artwork?: string
}

export function MediaPlayer({
  src,
  title,
  type,
  className,
  autoPlay = false,
  onTimeUpdate,
  onEnded,
  artist,
  album,
  artwork,
  poster,
}: MediaPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null!)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detectedMediaType, setDetectedMediaType] = useState<'video' | 'audio' | null>(null)

  // Enhanced media type detection logic with comprehensive routing
  const detectMediaType = useCallback(
    (url: string, providedType?: 'video' | 'audio'): 'video' | 'audio' => {
      // If type is explicitly provided, use it (highest priority)
      if (providedType) {
        console.log(`Media type explicitly provided: ${providedType}`)
        return providedType
      }

      // Detect based on URL patterns and file extensions
      const urlLower = url.toLowerCase()

      // Lossless audio file extensions (prioritized for LosslessAudioPlayer)
      const losslessAudioExtensions = ['.flac', '.wav', '.alac', '.ape', '.wv']

      // Standard audio file extensions
      const audioExtensions = ['.mp3', '.aac', '.m4a', '.ogg', '.wma', '.opus']

      // Audio URL patterns and API endpoints
      const audioPatterns = [
        '/audio/',
        'audio=',
        'type=audio',
        '/music/',
        '/songs/',
        '/tracks/',
        'format=audio',
        'content-type=audio',
        'mime=audio',
      ]

      // Video file extensions (for MSEVideoPlayer with HEVC support)
      const videoExtensions = [
        '.mp4',
        '.mkv',
        '.avi',
        '.mov',
        '.wmv',
        '.webm',
        '.m4v',
        '.ts',
        '.m3u8',
      ]

      // Video URL patterns and streaming endpoints
      const videoPatterns = [
        '/video/',
        'video=',
        'type=video',
        '/stream',
        '/movies/',
        '/tvs/',
        '/episodes/',
        '/seasons/',
        'format=video',
        'content-type=video',
        'mime=video',
      ]

      // Check for lossless audio first (highest priority for audio detection)
      if (losslessAudioExtensions.some((ext) => urlLower.includes(ext))) {
        console.log('Detected lossless audio format, routing to LosslessAudioPlayer')
        return 'audio'
      }

      // Check for standard audio formats
      if (
        audioExtensions.some((ext) => urlLower.includes(ext)) ||
        audioPatterns.some((pattern) => urlLower.includes(pattern))
      ) {
        console.log('Detected audio format, routing to LosslessAudioPlayer')
        return 'audio'
      }

      // Check for video formats (route to MSEVideoPlayer with HEVC support)
      if (
        videoExtensions.some((ext) => urlLower.includes(ext)) ||
        videoPatterns.some((pattern) => urlLower.includes(pattern))
      ) {
        console.log('Detected video format, routing to MSEVideoPlayer')
        return 'video'
      }

      // Special handling for streaming endpoints without clear extensions
      if (urlLower.includes('/stream') || urlLower.includes('/play')) {
        // Check query parameters for hints
        const urlParams = new URLSearchParams(url.split('?')[1] || '')
        const formatParam = urlParams.get('format') || urlParams.get('type')

        if (formatParam) {
          const format = formatParam.toLowerCase()
          if (format.includes('audio')) {
            console.log('Detected audio from URL parameters, routing to LosslessAudioPlayer')
            return 'audio'
          }
          if (format.includes('video')) {
            console.log('Detected video from URL parameters, routing to MSEVideoPlayer')
            return 'video'
          }
        }
      }

      // Default to video for unknown streaming endpoints (most common case)
      console.log('No specific media type detected, defaulting to video (MSEVideoPlayer)')
      return 'video'
    },
    []
  )

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

  // Initialize component state and detect media type
  useEffect(() => {
    if (!src) {
      setError('No media source provided')
      setIsLoading(false)
      setDetectedMediaType(null)
      return
    }

    // Detect media type from URL and provided type
    const mediaType = detectMediaType(src, type)
    setDetectedMediaType(mediaType)

    // Reset state for new source
    setError(null)
    setIsLoading(false)
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
  }, [src, type, detectMediaType])

  // Determine if we should show custom controls overlay
  const shouldShowCustomControls = useCallback((): boolean => {
    // Always show custom controls for video to maintain consistent UI
    if (detectedMediaType === 'video') {
      return true
    }

    // For audio, show custom controls if we want consistent UI across both player types
    // The LosslessAudioPlayer has its own controls, but we can overlay additional controls
    return false // Let LosslessAudioPlayer handle its own controls for now
  }, [detectedMediaType])

  // Get the current media element (video or audio)
  const getCurrentMediaElement = useCallback((): HTMLVideoElement | HTMLAudioElement | null => {
    if (detectedMediaType === 'video' && videoRef.current) {
      return videoRef.current
    }
    // For audio, we need to find the audio element within the LosslessAudioPlayer
    const audioElement = containerRef.current?.querySelector('audio')
    return audioElement || null
  }, [detectedMediaType])

  // Control functions that work with both video and audio
  const togglePlay = useCallback(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    if (mediaElement.paused) {
      mediaElement.play()
      setIsPlaying(true)
    } else {
      mediaElement.pause()
      setIsPlaying(false)
    }
  }, [getCurrentMediaElement])

  const handleSeek = useCallback(
    (value: number[]) => {
      const mediaElement = getCurrentMediaElement()
      if (!mediaElement || !duration) return

      const newTime = (value[0] / 100) * duration
      mediaElement.currentTime = newTime
      setCurrentTime(newTime)
    },
    [getCurrentMediaElement, duration]
  )

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const mediaElement = getCurrentMediaElement()
      if (!mediaElement) return

      const newVolume = value[0] / 100
      mediaElement.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    },
    [getCurrentMediaElement]
  )

  const toggleMute = useCallback(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    if (mediaElement.muted) {
      mediaElement.muted = false
      setIsMuted(false)
    } else {
      mediaElement.muted = true
      setIsMuted(true)
    }
  }, [getCurrentMediaElement])

  const skipForward = useCallback(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    const newTime = Math.min(mediaElement.currentTime + 10, duration)
    mediaElement.currentTime = newTime
    setCurrentTime(newTime)
  }, [getCurrentMediaElement, duration])

  const skipBackward = useCallback(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    const newTime = Math.max(mediaElement.currentTime - 10, 0)
    mediaElement.currentTime = newTime
    setCurrentTime(newTime)
  }, [getCurrentMediaElement])

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }, [isFullscreen])

  const togglePictureInPicture = useCallback(async () => {
    if (detectedMediaType !== 'video' || !videoRef.current) return

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (videoRef.current.requestPictureInPicture) {
        await videoRef.current.requestPictureInPicture()
      }
    } catch (error) {
      console.warn('Picture-in-Picture not supported or failed:', error)
    }
  }, [detectedMediaType])

  // Handle media routing errors and fallbacks
  const handleMediaRoutingError = useCallback((error: string, attemptedType: 'video' | 'audio') => {
    console.error(`Media routing error for ${attemptedType}:`, error)

    // If video player fails, don't try audio fallback (different use cases)
    // If audio player fails, don't try video fallback (different use cases)
    // Instead, show appropriate error message
    const errorMessage =
      attemptedType === 'video'
        ? `Video playback failed: ${error}. Please check if the video format is supported.`
        : `Audio playback failed: ${error}. Please check if the audio format is supported.`

    setError(errorMessage)
    setIsLoading(false)
  }, [])

  // Event handlers for new player components
  const handlePlayerTimeUpdate = useCallback(
    (currentTime: number, duration: number) => {
      setCurrentTime(currentTime)
      setDuration(duration)
      onTimeUpdate?.(currentTime, duration)
    },
    [onTimeUpdate]
  )

  const handlePlayerError = useCallback(
    (error: string) => {
      // Route error handling based on detected media type
      if (detectedMediaType) {
        handleMediaRoutingError(error, detectedMediaType)
      } else {
        setError(error)
        setIsLoading(false)
      }
    },
    [detectedMediaType, handleMediaRoutingError]
  )

  const handlePlayerLoadedMetadata = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handlePlayerWaiting = useCallback(() => {
    setIsLoading(true)
  }, [])

  const handlePlayerCanPlay = useCallback(() => {
    setIsLoading(false)
  }, [])

  const handlePlayerEnded = useCallback(() => {
    setIsPlaying(false)
    onEnded?.()
  }, [onEnded])

  // Sync player state across different media types for consistent UI
  const syncPlayerState = useCallback(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    // Sync play/pause state
    setIsPlaying(!mediaElement.paused)

    // Sync volume and mute state
    setVolume(mediaElement.volume)
    setIsMuted(mediaElement.muted)

    // Sync time and duration
    setCurrentTime(mediaElement.currentTime)
    setDuration(mediaElement.duration || 0)
  }, [getCurrentMediaElement])

  // Monitor media element state changes for consistent UI
  useEffect(() => {
    const mediaElement = getCurrentMediaElement()
    if (!mediaElement) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleVolumeChange = () => {
      setVolume(mediaElement.volume)
      setIsMuted(mediaElement.muted)
    }

    mediaElement.addEventListener('play', handlePlay)
    mediaElement.addEventListener('pause', handlePause)
    mediaElement.addEventListener('volumechange', handleVolumeChange)

    // Initial sync
    syncPlayerState()

    return () => {
      mediaElement.removeEventListener('play', handlePlay)
      mediaElement.removeEventListener('pause', handlePause)
      mediaElement.removeEventListener('volumechange', handleVolumeChange)
    }
  }, [getCurrentMediaElement, syncPlayerState])

  // Auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false)
      }
    }, 3000)
  }, [isPlaying])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when the media player container is focused or active
      if (
        !containerRef.current?.contains(document.activeElement) &&
        !containerRef.current?.matches(':hover')
      ) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipBackward()
          break
        case 'ArrowRight':
          e.preventDefault()
          skipForward()
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
          toggleMute()
          break
        case 'KeyF':
          e.preventDefault()
          if (detectedMediaType === 'video') {
            toggleFullscreen()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    togglePlay,
    skipBackward,
    skipForward,
    handleVolumeChange,
    volume,
    toggleMute,
    toggleFullscreen,
    detectedMediaType,
  ])

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Mouse movement for controls
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = () => {
      showControlsTemporarily()
    }

    const handleMouseLeave = () => {
      if (isPlaying) {
        setShowControls(false)
      }
    }

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [isPlaying, showControlsTemporarily])

  if (error) {
    return (
      <div
        className={cn(
          'relative bg-black rounded-lg overflow-hidden flex items-center justify-center',
          type === 'video' ? 'aspect-video' : 'h-32',
          className
        )}
      >
        <div className="text-center text-white">
          <p className="text-lg font-medium mb-2">Failed to load media</p>
          <p className="text-sm text-white/60">Please try again later</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
        detectedMediaType === 'video' ? 'aspect-video' : 'h-32',
        className
      )}
      onClick={detectedMediaType === 'video' ? togglePlay : undefined}
      tabIndex={0} // Make focusable for keyboard shortcuts
    >
      {/* Media Element - New MSE and Lossless Audio Implementation */}
      {detectedMediaType === 'video' ? (
        <MSEVideoPlayer
          src={src}
          poster={poster}
          className="w-full h-full"
          autoPlay={autoPlay}
          videoRef={videoRef}
          onTimeUpdate={handlePlayerTimeUpdate}
          onError={handlePlayerError}
          onLoadedMetadata={handlePlayerLoadedMetadata}
          onWaiting={handlePlayerWaiting}
          onCanPlay={handlePlayerCanPlay}
          onEnded={handlePlayerEnded}
        />
      ) : detectedMediaType === 'audio' ? (
        <LosslessAudioPlayer
          src={src}
          title={title}
          artist={artist}
          album={album}
          artwork={artwork}
          className="w-full h-full"
          autoPlay={autoPlay}
          onTimeUpdate={handlePlayerTimeUpdate}
          onError={handlePlayerError}
          onLoadedMetadata={handlePlayerLoadedMetadata}
          onWaiting={handlePlayerWaiting}
          onCanPlay={handlePlayerCanPlay}
          onEnded={handlePlayerEnded}
        />
      ) : (
        // Loading state while detecting media type
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-white/60">Detecting media type...</p>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Controls - Show based on media type and UI consistency requirements */}
      {shouldShowCustomControls() && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300',
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          )}
        >
          {/* Progress Bar */}
          <div className="absolute bottom-16 left-4 right-4">
            <div className="relative">
              {/* Buffered Progress - Placeholder */}
              <div className="absolute inset-0 bg-white/20 rounded-full h-1">
                <div
                  className="bg-white/40 h-full rounded-full transition-all duration-300"
                  style={{ width: '0%' }}
                />
              </div>
              {/* Seek Slider */}
              <Slider
                value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                className="relative z-10"
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  togglePlay()
                }}
                className="text-white hover:bg-white/20 p-2"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              {/* Skip Controls */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  skipBackward()
                }}
                className="text-white hover:bg-white/20 p-2"
              >
                <SkipBack className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  skipForward()
                }}
                className="text-white hover:bg-white/20 p-2"
              >
                <SkipForward className="w-4 h-4" />
              </Button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleMute()
                  }}
                  className="text-white hover:bg-white/20 p-2"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
                <div className="w-20">
                  <Slider
                    value={[isMuted ? 0 : volume * 100]}
                    onValueChange={handleVolumeChange}
                    max={100}
                    step={1}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {/* Time Display */}
              <div className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Picture in Picture (Video only) */}
              {detectedMediaType === 'video' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    togglePictureInPicture()
                  }}
                  className="text-white hover:bg-white/20 p-2"
                >
                  <PictureInPicture className="w-4 h-4" />
                </Button>
              )}

              {/* Settings */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="text-white hover:bg-white/20 p-2"
              >
                <Settings className="w-4 h-4" />
              </Button>

              {/* Cast */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="text-white hover:bg-white/20 p-2"
              >
                <Cast className="w-4 h-4" />
              </Button>

              {/* Download */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
                className="text-white hover:bg-white/20 p-2"
              >
                <Download className="w-4 h-4" />
              </Button>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFullscreen()
                }}
                className="text-white hover:bg-white/20 p-2"
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
