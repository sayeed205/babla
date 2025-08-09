/**
 * MediaPlayerProvider - React Context Provider for Media Player
 * Provides media player state and actions throughout the application
 */

import React, { createContext, useContext, useEffect, useRef } from 'react'
import type { MediaPlayerStore } from '../stores/media-player-store'
import { useMediaPlayerStore } from '../stores/media-player-store'

// Context interface - exposes the complete store interface
export interface MediaPlayerContextValue extends MediaPlayerStore {
  // Additional provider-specific methods can be added here if needed
}

// Create the context
const MediaPlayerContext = createContext<MediaPlayerContextValue | null>(null)

// Provider props interface
export interface MediaPlayerProviderProps {
  children: React.ReactNode
}

/**
 * MediaPlayerProvider Component
 * Wraps the application to provide media player state and actions
 */
export function MediaPlayerProvider({ children }: MediaPlayerProviderProps) {
  // Get the store instance
  const store = useMediaPlayerStore()

  // Ref to track if provider is mounted
  const isMountedRef = useRef(true)

  // Provider initialization
  useEffect(() => {
    // Any initialization logic can go here
    // For example, restoring player state from localStorage

    return () => {
      // Cleanup on unmount
      isMountedRef.current = false

      // Stop any playing media and clear state
      if (store.playerState.isPlaying) {
        store.stop()
      }

      // Clear any errors
      store.clearError()
    }
  }, [store])

  // Handle global keyboard shortcuts
  useEffect(() => {
    if (!store.config.keyboard) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if no input is focused
      const activeElement = document.activeElement
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true')

      if (isInputFocused) {
        return
      }

      // Handle keyboard shortcuts
      switch (event.code) {
        case 'Space':
          event.preventDefault()
          if (store.playerState.currentMedia) {
            if (store.playerState.isPlaying) {
              store.pause()
            } else {
              store.resume()
            }
          }
          break

        case 'ArrowLeft':
          event.preventDefault()
          if (store.playerState.currentMedia) {
            const newTime = Math.max(0, store.playerState.currentTime - 10)
            store.seek(newTime)
          }
          break

        case 'ArrowRight':
          event.preventDefault()
          if (store.playerState.currentMedia) {
            const newTime = Math.min(store.playerState.duration, store.playerState.currentTime + 10)
            store.seek(newTime)
          }
          break

        case 'ArrowUp':
          event.preventDefault()
          if (store.playerState.currentMedia) {
            const newVolume = Math.min(1, store.playerState.volume + 0.1)
            store.setVolume(newVolume)
          }
          break

        case 'ArrowDown':
          event.preventDefault()
          if (store.playerState.currentMedia) {
            const newVolume = Math.max(0, store.playerState.volume - 0.1)
            store.setVolume(newVolume)
          }
          break

        case 'KeyM':
          event.preventDefault()
          if (store.playerState.currentMedia) {
            store.toggleMute()
          }
          break

        case 'KeyF':
          event.preventDefault()
          if (store.playerState.currentMedia) {
            store.toggleFullscreen()
          }
          break

        case 'Escape':
          event.preventDefault()
          if (store.playerState.isFullscreen) {
            store.setIsFullscreen(false)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [store, store.config.keyboard])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement)
      if (store.playerState.isFullscreen !== isFullscreen) {
        store.setIsFullscreen(isFullscreen)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [store])

  // Context value - pass through the entire store
  const contextValue: MediaPlayerContextValue = store

  return <MediaPlayerContext.Provider value={contextValue}>{children}</MediaPlayerContext.Provider>
}

/**
 * useMediaPlayer Hook
 * Custom hook to access media player context
 * Throws an error if used outside of MediaPlayerProvider
 */
export function useMediaPlayer(): MediaPlayerContextValue {
  const context = useContext(MediaPlayerContext)

  if (!context) {
    throw new Error(
      'useMediaPlayer must be used within a MediaPlayerProvider. ' +
        'Make sure to wrap your component tree with <MediaPlayerProvider>.'
    )
  }

  return context
}

/**
 * useMediaPlayerOptional Hook
 * Optional version of useMediaPlayer that returns null if no provider is found
 * Useful for components that can work with or without the media player
 */
export function useMediaPlayerOptional(): MediaPlayerContextValue | null {
  return useContext(MediaPlayerContext)
}

// Re-export store selectors for convenience
export {
  useCurrentIndex,
  useCurrentMedia,
  useIsLoading,
  useIsPlaying,
  usePlayerConfig,
  usePlayerError,
  usePlayerState,
  useQueue,
} from '../stores/media-player-store'
