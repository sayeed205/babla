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

interface MediaPlayerProps {
  src: string
  title?: string
  poster?: string
  type?: 'video' | 'audio'
  className?: string
  autoPlay?: boolean
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
}

export function MediaPlayer({ src, title, type = 'video', className }: MediaPlayerProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Initialize component state
  useEffect(() => {
    if (!src) {
      setError('No media source provided')
      setIsLoading(false)
      return
    }

    // Reset state for new source
    setError(null)
    setIsLoading(false)
    setCurrentTime(0)
    setDuration(100) // Mock duration for UI testing
  }, [src])

  // Placeholder control functions - will be replaced with new implementation
  const togglePlay = useCallback(() => {
    // Placeholder - new implementation will handle play/pause
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleSeek = useCallback(
    (value: number[]) => {
      // Placeholder - new implementation will handle seeking
      const newTime = (value[0] / 100) * duration
      setCurrentTime(newTime)
    },
    [duration]
  )

  const handleVolumeChange = useCallback((value: number[]) => {
    // Placeholder - new implementation will handle volume
    const newVolume = value[0] / 100
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }, [])

  const toggleMute = useCallback(() => {
    // Placeholder - new implementation will handle muting
    setIsMuted(!isMuted)
  }, [isMuted])

  const skipForward = useCallback(() => {
    // Placeholder - new implementation will handle skipping
    const newTime = Math.min(currentTime + 10, duration)
    setCurrentTime(newTime)
  }, [currentTime, duration])

  const skipBackward = useCallback(() => {
    // Placeholder - new implementation will handle skipping
    const newTime = Math.max(currentTime - 10, 0)
    setCurrentTime(newTime)
  }, [currentTime])

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
    // Placeholder - new implementation will handle Picture-in-Picture
    console.log('Picture-in-Picture not yet implemented')
  }, [])

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
      if (!mediaRef.current) return

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
          toggleFullscreen()
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
        type === 'video' ? 'aspect-video' : 'h-32',
        className
      )}
      onClick={type === 'video' ? togglePlay : undefined}
    >
      {/* Media Element - Placeholder for new implementation */}
      {type === 'video' ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Video Player</p>
            <p className="text-sm text-white/60">New MSE implementation will be added here</p>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center">
            <p className="text-lg font-medium mb-2">Audio Player</p>
            <p className="text-sm text-white/60">
              New lossless audio implementation will be added here
            </p>
          </div>
        </div>
      )}

      {/* Audio Player Visual */}
      {type === 'audio' && (
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-blue-900/20 to-purple-900/20 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Volume2 className="w-8 h-8" />
            </div>
            {title && <p className="text-lg font-medium">{title}</p>}
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {/* Controls */}
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
            {type === 'video' && (
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
    </div>
  )
}
