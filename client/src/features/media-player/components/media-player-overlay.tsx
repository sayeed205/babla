/**
 * MediaPlayerOverlay Component
 * Global overlay component that appears when media is playing
 * Provides minimize/maximize functionality and responsive design
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, Maximize2, Minimize2, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useAccessibility } from '../hooks'
import { useMediaPlayer } from '../providers'
import { useErrorState } from '../stores/media-player-store'
import { AudioPlayer } from './audio-player'
import { ErrorDisplay } from './error-display'
import { MediaPlayerErrorBoundary } from './media-player-error-boundary'
import { UnsupportedMediaFallback } from './unsupported-media-fallback'
import { VideoPlayer } from './video-player'

// Overlay size states
type OverlaySize = 'minimized' | 'normal' | 'maximized'

// Overlay position for minimized state
interface OverlayPosition {
  x: number
  y: number
}

export function MediaPlayerOverlay() {
  const { playerState, stop } = useMediaPlayer()
  const errorState = useErrorState()
  const overlayRef = useRef<HTMLDivElement>(null!)
  const [overlaySize, setOverlaySize] = useState<OverlaySize>('normal')
  const [position, setPosition] = useState<OverlayPosition>({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  // Accessibility features
  const {
    getAriaAttributes,
    announceStateChange,
    getAccessibilityClasses,
    storeFocus,
    restorePreviousFocus,
    createSkipLink,
  } = useAccessibility(overlayRef, {
    trapFocus: overlaySize === 'maximized',
    restoreFocus: true,
    skipLinks: true,
  })

  // Show/hide overlay based on media state
  useEffect(() => {
    if (playerState.currentMedia) {
      setIsVisible(true)
    } else {
      // Delay hiding to allow for smooth animations
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [playerState.currentMedia])

  // Handle overlay close
  const handleClose = useCallback(() => {
    announceStateChange('Media player closed')
    restorePreviousFocus()
    stop()
    setOverlaySize('normal')
  }, [stop, announceStateChange, restorePreviousFocus])

  // Handle minimize/maximize
  const handleToggleSize = useCallback(() => {
    let newSize: OverlaySize
    if (overlaySize === 'minimized') {
      newSize = 'normal'
      announceStateChange('Media player restored')
    } else if (overlaySize === 'normal') {
      newSize = 'maximized'
      announceStateChange('Media player maximized')
      storeFocus()
    } else {
      newSize = 'normal'
      announceStateChange('Media player restored')
      restorePreviousFocus()
    }
    setOverlaySize(newSize)
  }, [overlaySize, announceStateChange, storeFocus, restorePreviousFocus])

  const handleMinimize = useCallback(() => {
    setOverlaySize('minimized')
    announceStateChange('Media player minimized')
  }, [announceStateChange])

  // Drag functionality for minimized state
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (overlaySize !== 'minimized') return

      setIsDragging(true)
      const rect = e.currentTarget.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    [overlaySize]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || overlaySize !== 'minimized') return

      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      // Keep within viewport bounds
      const maxX = window.innerWidth - 320 // Approximate minimized width
      const maxY = window.innerHeight - 180 // Approximate minimized height

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      })
    },
    [isDragging, overlaySize, dragOffset]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Handle escape key to close overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && playerState.currentMedia && !playerState.isFullscreen) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose, playerState.currentMedia, playerState.isFullscreen])

  // Don't render if no media or not visible
  if (!isVisible || !playerState.currentMedia) {
    return null
  }

  // Render appropriate player component based on media type
  const renderPlayer = () => {
    if (!playerState.currentMedia) return null

    // Show error display if there's an error
    if (errorState.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full p-4">
          <ErrorDisplay errorState={errorState} compact={overlaySize === 'minimized'} />
        </div>
      )
    }

    // Check for unsupported media types
    const supportedTypes = ['movie', 'tv', 'music']
    if (!supportedTypes.includes(playerState.currentMedia.type)) {
      return (
        <div className="flex items-center justify-center w-full h-full p-4">
          <UnsupportedMediaFallback media={playerState.currentMedia} onClose={handleClose} />
        </div>
      )
    }

    // Render appropriate player component
    switch (playerState.currentMedia.type) {
      case 'movie':
      case 'tv':
        return (
          <MediaPlayerErrorBoundary
            onError={(error, errorInfo) => {
              console.error('Video player error:', error, errorInfo)
            }}
            onRetry={() => {
              // Retry logic could be implemented here
              window.location.reload()
            }}
          >
            <VideoPlayer media={playerState.currentMedia} className="w-full h-full" />
          </MediaPlayerErrorBoundary>
        )
      case 'music':
        return (
          <MediaPlayerErrorBoundary
            onError={(error, errorInfo) => {
              console.error('Audio player error:', error, errorInfo)
            }}
            onRetry={() => {
              // Retry logic could be implemented here
              window.location.reload()
            }}
          >
            <AudioPlayer media={playerState.currentMedia} className="w-full h-full" />
          </MediaPlayerErrorBoundary>
        )
      default:
        return (
          <div className="flex items-center justify-center w-full h-full p-4">
            <UnsupportedMediaFallback media={playerState.currentMedia} onClose={handleClose} />
          </div>
        )
    }
  }

  // Overlay styles based on size state
  const getOverlayStyles = () => {
    switch (overlaySize) {
      case 'minimized':
        return {
          position: 'fixed' as const,
          left: position.x,
          top: position.y,
          width: '320px',
          height: '180px',
          zIndex: 1000,
        }
      case 'maximized':
        return {
          position: 'fixed' as const,
          inset: 0,
          zIndex: 1000,
        }
      default: // normal
        return {
          position: 'fixed' as const,
          bottom: '20px',
          right: '20px',
          width: '480px',
          height: '270px',
          zIndex: 1000,
        }
    }
  }

  const overlayStyles = getOverlayStyles()

  return (
    <>
      {/* Skip link for accessibility */}
      {overlaySize === 'maximized' && (
        <a
          {...createSkipLink('media-player-controls', 'Skip to media player controls')}
          className="skip-link"
        />
      )}

      <div
        ref={overlayRef}
        className={cn(
          'media-player-overlay bg-black rounded-lg shadow-2xl border border-gray-800 overflow-hidden transition-all duration-300 ease-in-out',
          getAccessibilityClasses(),
          {
            'cursor-move': overlaySize === 'minimized',
            'animate-in slide-in-from-bottom-4 fade-in-0': isVisible,
            'animate-out slide-out-to-bottom-4 fade-out-0': !isVisible,
          }
        )}
        style={overlayStyles}
        onMouseDown={handleMouseDown}
        {...getAriaAttributes('player')}
        role="dialog"
        aria-modal={overlaySize === 'maximized'}
        aria-label={`Media player: ${playerState.currentMedia?.title || 'No media'}`}
      >
        {/* Header with controls */}
        <div
          id="media-player-controls"
          className={cn(
            'flex items-center justify-between bg-gray-900/90 backdrop-blur-sm px-3 py-2 border-b border-gray-700',
            {
              'cursor-move': overlaySize === 'minimized',
              'hidden': overlaySize === 'maximized' && playerState.isFullscreen,
            }
          )}
          {...getAriaAttributes('controls')}
        >
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <h3 className="text-white text-sm font-medium truncate">
                {playerState.currentMedia.title}
              </h3>
              {playerState.currentMedia.type === 'tv' && (
                <p className="text-gray-400 text-xs truncate">
                  {(playerState.currentMedia as any).seriesTitle &&
                    `${(playerState.currentMedia as any).seriesTitle} • `}
                  S{(playerState.currentMedia as any).seasonNumber}E
                  {(playerState.currentMedia as any).episodeNumber}
                </p>
              )}
              {playerState.currentMedia.type === 'music' && (
                <p className="text-gray-400 text-xs truncate">
                  {(playerState.currentMedia as any).artist}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {/* Minimize/Restore button */}
            {overlaySize !== 'minimized' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700 media-player-button"
                onClick={handleMinimize}
                aria-label="Minimize media player"
                title="Minimize"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            )}

            {/* Maximize/Restore button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700 media-player-button"
              onClick={handleToggleSize}
              aria-label={
                overlaySize === 'maximized'
                  ? 'Restore media player'
                  : overlaySize === 'minimized'
                    ? 'Restore media player'
                    : 'Maximize media player'
              }
              title={
                overlaySize === 'maximized'
                  ? 'Restore'
                  : overlaySize === 'minimized'
                    ? 'Restore'
                    : 'Maximize'
              }
            >
              {overlaySize === 'maximized' ? (
                <ChevronDown className="h-3 w-3" />
              ) : overlaySize === 'minimized' ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <Maximize2 className="h-3 w-3" />
              )}
            </Button>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-white hover:bg-red-600 media-player-button"
              onClick={handleClose}
              aria-label="Close media player"
              title="Close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Player content */}
        <div
          className={cn('relative bg-black', {
            'h-[calc(100%-40px)]': overlaySize !== 'maximized' || !playerState.isFullscreen,
            'h-full': overlaySize === 'maximized' && playerState.isFullscreen,
          })}
        >
          {renderPlayer()}

          {/* Loading overlay */}
          {playerState.isLoading && !errorState.hasError && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="text-white text-sm">Loading...</p>
              </div>
            </div>
          )}

          {/* Recovery overlay */}
          {errorState.isRecovering && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="text-white text-sm">Recovering...</p>
              </div>
            </div>
          )}
        </div>

        {/* Resize handle for minimized state */}
        {overlaySize === 'minimized' && (
          <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-50 hover:opacity-100">
            <div className="absolute bottom-1 right-1 w-2 h-2 border-r border-b border-gray-500"></div>
          </div>
        )}
      </div>
    </>
  )
}
