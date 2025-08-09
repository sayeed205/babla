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
    }
  }, [])

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
  }, [])

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
