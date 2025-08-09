/**
 * PlayerControls Component
 * Reusable control interface with full accessibility support
 */

import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import {
  Maximize,
  Minimize,
  Pause,
  PictureInPicture,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCallback, useRef } from 'react'
import { useAccessibility } from '../hooks/use-accessibility'
import { useMediaPlayer } from '../providers'

interface PlayerControlsProps {
  className?: string
  compact?: boolean
  showQueue?: boolean
}

export function PlayerControls({
  className,
  compact = false,
  showQueue = true,
}: PlayerControlsProps) {
  const controlsRef = useRef<HTMLDivElement>(null!)
  const {
    playerState,
    config,
    pause,
    resume,
    seek,
    setVolume,
    toggleMute,
    toggleFullscreen,
    togglePictureInPicture,
    setPlaybackRate,
    playNext,
    playPrevious,
    queue,
  } = useMediaPlayer()

  const { getAriaAttributes, announceStateChange, getAccessibilityClasses } =
    useAccessibility(controlsRef)

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    if (!playerState.currentMedia) return

    if (playerState.isPlaying) {
      pause()
      announceStateChange('Paused')
    } else {
      resume()
      announceStateChange('Playing')
    }
  }, [playerState.isPlaying, playerState.currentMedia, pause, resume, announceStateChange])

  // Handle seek
  const handleSeek = useCallback(
    (value: number[]) => {
      const newTime = value[0]
      seek(newTime)
      announceStateChange(`Seeked to ${formatTime(newTime)}`)
    },
    [seek, announceStateChange]
  )

  // Handle volume change
  const handleVolumeChange = useCallback(
    (value: number[]) => {
      const newVolume = value[0] / 100
      setVolume(newVolume)
      announceStateChange(`Volume ${Math.round(newVolume * 100)}%`)
    },
    [setVolume, announceStateChange]
  )

  // Handle mute toggle
  const handleMuteToggle = useCallback(() => {
    toggleMute()
    announceStateChange(playerState.isMuted ? 'Unmuted' : 'Muted')
  }, [toggleMute, playerState.isMuted, announceStateChange])

  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    toggleFullscreen()
    announceStateChange(playerState.isFullscreen ? 'Exited fullscreen' : 'Entered fullscreen')
  }, [toggleFullscreen, playerState.isFullscreen, announceStateChange])

  // Handle picture-in-picture toggle
  const handlePiPToggle = useCallback(() => {
    if (playerState.currentMedia?.type === 'music') return
    togglePictureInPicture()
    announceStateChange(
      playerState.isPictureInPicture ? 'Exited picture-in-picture' : 'Entered picture-in-picture'
    )
  }, [
    togglePictureInPicture,
    playerState.isPictureInPicture,
    playerState.currentMedia,
    announceStateChange,
  ])

  // Handle playback rate change
  const handlePlaybackRateChange = useCallback(
    (direction: 'increase' | 'decrease') => {
      const rates = config.playbackRates
      const currentIndex = rates.indexOf(playerState.playbackRate)

      let newRate: number
      if (direction === 'increase') {
        newRate =
          currentIndex < rates.length - 1 ? rates[currentIndex + 1] : rates[rates.length - 1]
      } else {
        newRate = currentIndex > 0 ? rates[currentIndex - 1] : rates[0]
      }

      setPlaybackRate(newRate)
      announceStateChange(`Playback speed ${newRate}x`)
    },
    [config.playbackRates, playerState.playbackRate, setPlaybackRate, announceStateChange]
  )

  // Handle queue navigation
  const handleNext = useCallback(() => {
    playNext()
    announceStateChange('Next track')
  }, [playNext, announceStateChange])

  const handlePrevious = useCallback(() => {
    playPrevious()
    announceStateChange('Previous track')
  }, [playPrevious, announceStateChange])

  // Format time display
  const formatTimeDisplay = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '0:00'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Don't render if no media
  if (!playerState.currentMedia) {
    return null
  }

  //   const progressPercentage = playerState.duration
  //     ? (playerState.currentTime / playerState.duration) * 100
  //     : 0

  return (
    <div
      ref={controlsRef}
      className={cn(
        'flex flex-col space-y-2 p-4 bg-gray-900/90 backdrop-blur-sm text-white',
        getAccessibilityClasses(),
        {
          'p-2 space-y-1': compact,
        },
        className
      )}
      {...getAriaAttributes('controls')}
    >
      {/* Progress bar */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-mono min-w-[3rem] text-right">
          {formatTimeDisplay(playerState.currentTime)}
        </span>
        <div className="flex-1">
          <Slider
            value={[playerState.currentTime]}
            max={playerState.duration || 100}
            step={1}
            onValueChange={handleSeek}
            className="w-full"
            {...getAriaAttributes('progress')}
          />
        </div>
        <span className="text-xs font-mono min-w-[3rem]">
          {formatTimeDisplay(playerState.duration)}
        </span>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-between">
        {/* Left side - Queue controls */}
        {showQueue && queue.length > 1 && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size={compact ? 'sm' : 'default'}
              onClick={handlePrevious}
              disabled={queue.length <= 1}
              className="text-white hover:bg-gray-700"
              aria-label="Previous track"
            >
              <SkipBack className={cn('h-4 w-4', { 'h-3 w-3': compact })} />
            </Button>
          </div>
        )}

        {/* Center - Play/Pause */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size={compact ? 'sm' : 'lg'}
            onClick={handlePlayPause}
            className="text-white hover:bg-gray-700"
            aria-label={playerState.isPlaying ? 'Pause' : 'Play'}
            aria-pressed={playerState.isPlaying}
          >
            {playerState.isPlaying ? (
              <Pause className={cn('h-6 w-6', { 'h-4 w-4': compact })} />
            ) : (
              <Play className={cn('h-6 w-6', { 'h-4 w-4': compact })} />
            )}
          </Button>
        </div>

        {/* Right side - Queue controls */}
        {showQueue && queue.length > 1 && (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size={compact ? 'sm' : 'default'}
              onClick={handleNext}
              disabled={queue.length <= 1}
              className="text-white hover:bg-gray-700"
              aria-label="Next track"
            >
              <SkipForward className={cn('h-4 w-4', { 'h-3 w-3': compact })} />
            </Button>
          </div>
        )}
      </div>

      {/* Secondary controls */}
      {!compact && (
        <div className="flex items-center justify-between">
          {/* Volume controls */}
          <div className="flex items-center space-x-2 flex-1 max-w-[200px]">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMuteToggle}
              className="text-white hover:bg-gray-700"
              aria-label={playerState.isMuted ? 'Unmute' : 'Mute'}
              aria-pressed={playerState.isMuted}
            >
              {playerState.isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1">
              <Slider
                value={[playerState.volume * 100]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="w-full"
                {...getAriaAttributes('volume')}
              />
            </div>
            <span className="text-xs font-mono min-w-[3rem] text-right">
              {Math.round(playerState.volume * 100)}%
            </span>
          </div>

          {/* Playback rate */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePlaybackRateChange('decrease')}
              className="text-white hover:bg-gray-700 text-xs"
              aria-label="Decrease playback speed"
            >
              {'<'}
            </Button>
            <span className="text-xs font-mono min-w-[2rem] text-center">
              {playerState.playbackRate}x
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePlaybackRateChange('increase')}
              className="text-white hover:bg-gray-700 text-xs"
              aria-label="Increase playback speed"
            >
              {'>'}
            </Button>
          </div>

          {/* Display controls */}
          <div className="flex items-center space-x-1">
            {/* Picture-in-picture (video only) */}
            {playerState.currentMedia.type !== 'music' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePiPToggle}
                className="text-white hover:bg-gray-700"
                aria-label="Toggle picture-in-picture"
                aria-pressed={playerState.isPictureInPicture}
              >
                <PictureInPicture className="h-4 w-4" />
              </Button>
            )}

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreenToggle}
              className="text-white hover:bg-gray-700"
              aria-label="Toggle fullscreen"
              aria-pressed={playerState.isFullscreen}
            >
              {playerState.isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {playerState.isLoading && (
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span className="ml-2 text-xs">Loading...</span>
        </div>
      )}

      {/* Instructions for screen readers */}
      <div id="media-player-instructions" className="sr-only">
        Use spacebar to play or pause. Use arrow keys to seek and adjust volume. Use F for
        fullscreen, M to mute, and ? to show all keyboard shortcuts.
      </div>
    </div>
  )
}

// Helper function to format time
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0 seconds'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours} hours, ${minutes} minutes, ${remainingSeconds} seconds`
  }
  if (minutes > 0) {
    return `${minutes} minutes, ${remainingSeconds} seconds`
  }
  return `${remainingSeconds} seconds`
}
