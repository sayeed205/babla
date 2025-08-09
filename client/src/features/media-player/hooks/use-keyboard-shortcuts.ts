/**
 * useKeyboardShortcuts Hook
 * Enhanced keyboard shortcuts for media player with accessibility support
 */

import { useCallback, useEffect, useRef } from 'react'
import { useMediaPlayer } from '../providers'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  description: string
  action: () => void
  category: 'playback' | 'navigation' | 'volume' | 'display' | 'queue'
}

export interface KeyboardShortcutsConfig {
  enabled: boolean
  announceShortcuts: boolean
  preventDefaultOnInputs: boolean
}

const defaultConfig: KeyboardShortcutsConfig = {
  enabled: true,
  announceShortcuts: true,
  preventDefaultOnInputs: true,
}

/**
 * Hook for managing keyboard shortcuts with accessibility features
 */
export function useKeyboardShortcuts(config: Partial<KeyboardShortcutsConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }
  const {
    playerState,
    config: playerConfig,
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
    stop,
  } = useMediaPlayer()

  const announcementTimeoutRef = useRef<NodeJS.Timeout>(null!)

  // Announce shortcut actions to screen readers
  const announceAction = useCallback(
    (message: string) => {
      if (!finalConfig.announceShortcuts) return

      // Clear previous announcement
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current)
      }

      // Create or update ARIA live region
      let liveRegion = document.getElementById('media-player-announcements')
      if (!liveRegion) {
        liveRegion = document.createElement('div')
        liveRegion.id = 'media-player-announcements'
        liveRegion.setAttribute('aria-live', 'polite')
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.style.position = 'absolute'
        liveRegion.style.left = '-10000px'
        liveRegion.style.width = '1px'
        liveRegion.style.height = '1px'
        liveRegion.style.overflow = 'hidden'
        document.body.appendChild(liveRegion)
      }

      // Announce the action
      liveRegion.textContent = message

      // Clear announcement after delay
      announcementTimeoutRef.current = setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = ''
        }
      }, 1000)
    },
    [finalConfig.announceShortcuts]
  )

  // Define keyboard shortcuts
  const shortcuts: KeyboardShortcut[] = [
    // Playback controls
    {
      key: 'Space',
      description: 'Play/Pause',
      category: 'playback',
      action: () => {
        if (!playerState.currentMedia) return
        if (playerState.isPlaying) {
          pause()
          announceAction('Paused')
        } else {
          resume()
          announceAction('Playing')
        }
      },
    },
    {
      key: 'KeyK',
      description: 'Play/Pause (alternative)',
      category: 'playback',
      action: () => {
        if (!playerState.currentMedia) return
        if (playerState.isPlaying) {
          pause()
          announceAction('Paused')
        } else {
          resume()
          announceAction('Playing')
        }
      },
    },
    {
      key: 'KeyS',
      description: 'Stop playback',
      category: 'playback',
      action: () => {
        if (playerState.currentMedia) {
          stop()
          announceAction('Stopped')
        }
      },
    },

    // Navigation controls
    {
      key: 'ArrowLeft',
      description: 'Seek backward 10 seconds',
      category: 'navigation',
      action: () => {
        if (!playerState.currentMedia) return
        const newTime = Math.max(0, playerState.currentTime - 10)
        seek(newTime)
        announceAction(`Seeked to ${formatTime(newTime)}`)
      },
    },
    {
      key: 'ArrowRight',
      description: 'Seek forward 10 seconds',
      category: 'navigation',
      action: () => {
        if (!playerState.currentMedia) return
        const newTime = Math.min(playerState.duration, playerState.currentTime + 10)
        seek(newTime)
        announceAction(`Seeked to ${formatTime(newTime)}`)
      },
    },
    {
      key: 'KeyJ',
      description: 'Seek backward 10 seconds (alternative)',
      category: 'navigation',
      action: () => {
        if (!playerState.currentMedia) return
        const newTime = Math.max(0, playerState.currentTime - 10)
        seek(newTime)
        announceAction(`Seeked to ${formatTime(newTime)}`)
      },
    },
    {
      key: 'KeyL',
      description: 'Seek forward 10 seconds (alternative)',
      category: 'navigation',
      action: () => {
        if (!playerState.currentMedia) return
        const newTime = Math.min(playerState.duration, playerState.currentTime + 10)
        seek(newTime)
        announceAction(`Seeked to ${formatTime(newTime)}`)
      },
    },
    {
      key: 'Home',
      description: 'Seek to beginning',
      category: 'navigation',
      action: () => {
        if (!playerState.currentMedia) return
        seek(0)
        announceAction('Seeked to beginning')
      },
    },
    {
      key: 'End',
      description: 'Seek to end',
      category: 'navigation',
      action: () => {
        if (!playerState.currentMedia) return
        seek(playerState.duration)
        announceAction('Seeked to end')
      },
    },

    // Volume controls
    {
      key: 'ArrowUp',
      description: 'Increase volume',
      category: 'volume',
      action: () => {
        if (!playerState.currentMedia) return
        const newVolume = Math.min(1, playerState.volume + 0.1)
        setVolume(newVolume)
        announceAction(`Volume ${Math.round(newVolume * 100)}%`)
      },
    },
    {
      key: 'ArrowDown',
      description: 'Decrease volume',
      category: 'volume',
      action: () => {
        if (!playerState.currentMedia) return
        const newVolume = Math.max(0, playerState.volume - 0.1)
        setVolume(newVolume)
        announceAction(`Volume ${Math.round(newVolume * 100)}%`)
      },
    },
    {
      key: 'KeyM',
      description: 'Toggle mute',
      category: 'volume',
      action: () => {
        if (!playerState.currentMedia) return
        toggleMute()
        announceAction(playerState.isMuted ? 'Unmuted' : 'Muted')
      },
    },

    // Display controls
    {
      key: 'KeyF',
      description: 'Toggle fullscreen',
      category: 'display',
      action: () => {
        if (!playerState.currentMedia) return
        toggleFullscreen()
        announceAction(playerState.isFullscreen ? 'Exited fullscreen' : 'Entered fullscreen')
      },
    },
    {
      key: 'KeyP',
      description: 'Toggle picture-in-picture',
      category: 'display',
      action: () => {
        if (!playerState.currentMedia || playerState.currentMedia.type === 'music') return
        togglePictureInPicture()
        announceAction(
          playerState.isPictureInPicture
            ? 'Exited picture-in-picture'
            : 'Entered picture-in-picture'
        )
      },
    },

    // Playback rate controls
    {
      key: 'Comma',
      shiftKey: true, // <
      description: 'Decrease playback speed',
      category: 'playback',
      action: () => {
        if (!playerState.currentMedia) return
        const currentRate = playerState.playbackRate
        const rates = playerConfig.playbackRates
        const currentIndex = rates.indexOf(currentRate)
        const newRate = currentIndex > 0 ? rates[currentIndex - 1] : rates[0]
        setPlaybackRate(newRate)
        announceAction(`Playback speed ${newRate}x`)
      },
    },
    {
      key: 'Period',
      shiftKey: true, // >
      description: 'Increase playback speed',
      category: 'playback',
      action: () => {
        if (!playerState.currentMedia) return
        const currentRate = playerState.playbackRate
        const rates = playerConfig.playbackRates
        const currentIndex = rates.indexOf(currentRate)
        const newRate =
          currentIndex < rates.length - 1 ? rates[currentIndex + 1] : rates[rates.length - 1]
        setPlaybackRate(newRate)
        announceAction(`Playback speed ${newRate}x`)
      },
    },

    // Queue controls
    {
      key: 'KeyN',
      description: 'Next track',
      category: 'queue',
      action: () => {
        playNext()
        announceAction('Next track')
      },
    },
    {
      key: 'KeyB',
      description: 'Previous track',
      category: 'queue',
      action: () => {
        playPrevious()
        announceAction('Previous track')
      },
    },

    // Help
    {
      key: 'Slash',
      shiftKey: true, // ?
      description: 'Show keyboard shortcuts help',
      category: 'navigation',
      action: () => {
        showKeyboardHelp()
      },
    },
  ]

  // Show keyboard shortcuts help
  const showKeyboardHelp = useCallback(() => {
    const helpText = shortcuts.reduce(
      (acc, shortcut) => {
        if (!acc[shortcut.category]) {
          acc[shortcut.category] = []
        }
        acc[shortcut.category].push(shortcut)
        return acc
      },
      {} as Record<string, KeyboardShortcut[]>
    )

    const helpMessage = Object.entries(helpText)
      .map(([category, categoryShortcuts]) => {
        const categoryName = category.charAt(0).toUpperCase() + category.slice(1)
        const shortcuts = categoryShortcuts
          .map((s) => {
            let keyDisplay = s.key.replace('Key', '').replace('Arrow', '')
            if (s.shiftKey) keyDisplay = `Shift+${keyDisplay}`
            if (s.ctrlKey) keyDisplay = `Ctrl+${keyDisplay}`
            if (s.altKey) keyDisplay = `Alt+${keyDisplay}`
            return `${keyDisplay}: ${s.description}`
          })
          .join('\n')
        return `${categoryName}:\n${shortcuts}`
      })
      .join('\n\n')

    // Create modal or alert with help text
    // For now, we'll use console.log and announce to screen readers
    console.log('Keyboard Shortcuts:\n', helpMessage)
    announceAction('Keyboard shortcuts logged to console')
  }, [shortcuts, announceAction])

  // Check if element should receive keyboard events
  const shouldHandleKeyboard = useCallback(
    (event: KeyboardEvent) => {
      if (!finalConfig.enabled || !playerConfig.keyboard) return false

      const activeElement = document.activeElement
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'SELECT' ||
          activeElement.getAttribute('contenteditable') === 'true' ||
          activeElement.getAttribute('role') === 'textbox')

      // Allow shortcuts in inputs only for specific keys if configured
      if (isInputFocused && finalConfig.preventDefaultOnInputs) {
        // Allow escape and F keys in inputs
        return event.key === 'Escape' || event.key.startsWith('F')
      }

      return true
    },
    [finalConfig.enabled, finalConfig.preventDefaultOnInputs, playerConfig.keyboard]
  )

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandleKeyboard(event)) return

      // Find matching shortcut
      const shortcut = shortcuts.find(
        (s) =>
          s.key === event.code &&
          Boolean(s.ctrlKey) === event.ctrlKey &&
          Boolean(s.altKey) === event.altKey &&
          Boolean(s.shiftKey) === event.shiftKey
      )

      if (shortcut) {
        event.preventDefault()
        event.stopPropagation()
        shortcut.action()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current)
      }
    }
  }, [shortcuts, shouldHandleKeyboard])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Remove announcement element
      const liveRegion = document.getElementById('media-player-announcements')
      if (liveRegion) {
        document.body.removeChild(liveRegion)
      }
    }
  }, [])

  return {
    shortcuts,
    announceAction,
    showKeyboardHelp,
  }
}

// Helper function to format time for announcements
function formatTime(seconds: number): string {
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
