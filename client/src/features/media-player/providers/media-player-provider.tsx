/**
 * MediaPlayerProvider - React Context Provider for Media Player
 * Provides media player state and actions throughout the application
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { KeyboardShortcutsHelp } from '../components'
import { useKeyboardShortcuts } from '../hooks'
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

  // State for keyboard shortcuts help
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)

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

  // Use enhanced keyboard shortcuts hook
  const { shortcuts } = useKeyboardShortcuts({
    enabled: store.config.keyboard,
    announceShortcuts: true,
    preventDefaultOnInputs: true,
  })

  // Override the help shortcut to show our modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && event.shiftKey && store.config.keyboard) {
        event.preventDefault()
        setShowKeyboardHelp(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [store.config.keyboard])

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

  return (
    <MediaPlayerContext.Provider value={contextValue}>
      {children}

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        shortcuts={shortcuts}
      />
    </MediaPlayerContext.Provider>
  )
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
