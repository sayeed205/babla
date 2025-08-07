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
import { useCallback, useEffect, useRef } from 'react'

export function GlobalMediaPlayer() {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Media event handlers
  const handleLoadedMetadata = useCallback(() => {
    if (mediaRef.current) {
      updateDuration(mediaRef.current.duration)
    }
  }, [updateDuration])

  const handleTimeUpdate = useCallback(() => {
    if (mediaRef.current) {
      updateCurrentTime(mediaRef.current.currentTime)
    }
  }, [updateCurrentTime])

  const handleEnded = useCallback(() => {
    if (repeatMode === 'one') {
      // Repeat current media
      if (mediaRef.current) {
        mediaRef.current.currentTime = 0
        mediaRef.current.play()
      }
    } else {
      playNext()
    }
  }, [repeatMode, playNext])

  const handleError = useCallback(() => {
    console.error('Media playback error')
    setIsPlaying(false)
  }, [setIsPlaying])

  // Control functions
  const togglePlay = useCallback(() => {
    if (!mediaRef.current) return

    if (isPlaying) {
      mediaRef.current.pause()
      pause()
    } else {
      mediaRef.current.play()
      resume()
    }
  }, [isPlaying, pause, resume])

  const handleSeek = useCallback(
    (value: number[]) => {
      if (!mediaRef.current) return
      const newTime = (value[0] / 100) * duration
      mediaRef.current.currentTime = newTime
      seekTo(newTime)
    },
    [duration, seekTo]
  )

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      if (!mediaRef.current) return
      const newVolume = value[0] / 100
      mediaRef.current.volume = newVolume
      setVolume(newVolume)
    },
    [setVolume]
  )

  const handleToggleMute = useCallback(() => {
    if (!mediaRef.current) return
    toggleMute()
    mediaRef.current.volume = isMuted ? volume : 0
  }, [toggleMute, isMuted, volume])

  const handleRepeatClick = useCallback(() => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all']
    const currentIndex = modes.indexOf(repeatMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    setRepeatMode(nextMode)
  }, [repeatMode, setRepeatMode])

  // Sync media element with store state
  useEffect(() => {
    if (!mediaRef.current) return

    if (isPlaying) {
      mediaRef.current.play().catch(console.error)
    } else {
      mediaRef.current.pause()
    }
  }, [isPlaying])

  useEffect(() => {
    if (!mediaRef.current) return
    mediaRef.current.volume = isMuted ? 0 : volume
  }, [volume, isMuted])

  useEffect(() => {
    if (!mediaRef.current) return
    mediaRef.current.currentTime = currentTime
  }, [currentTime])

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlayerVisible || !currentMedia) return

      // Only handle shortcuts if not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          seekTo(Math.max(currentTime - 10, 0))
          break
        case 'ArrowRight':
          e.preventDefault()
          seekTo(Math.min(currentTime + 10, duration))
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
          if (currentMedia?.type === 'video') {
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
  ])

  if (!isPlayerVisible || !currentMedia) {
    return null
  }

  const isVideo = currentMedia.type === 'video'
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
      {/* Media Element */}
      {isVideo ? (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={currentMedia.src}
          poster={posterUrl}
          className={cn('w-full h-full object-contain', isMinimized ? 'hidden' : 'block')}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          preload="metadata"
        />
      ) : (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={currentMedia.src}
          className="hidden"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          onError={handleError}
          preload="metadata"
        />
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
