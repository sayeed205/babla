/**
 * useAccessibility Hook
 * Accessibility features for media player including focus management,
 * ARIA attributes, and user preferences
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useMediaPlayer } from '../providers'

export interface AccessibilityPreferences {
  reduceMotion: boolean
  highContrast: boolean
  announceStateChanges: boolean
  focusManagement: boolean
  keyboardNavigation: boolean
}

export interface FocusManagementOptions {
  trapFocus: boolean
  restoreFocus: boolean
  skipLinks: boolean
}

const defaultPreferences: AccessibilityPreferences = {
  reduceMotion: false,
  highContrast: false,
  announceStateChanges: true,
  focusManagement: true,
  keyboardNavigation: true,
}

/**
 * Hook for managing accessibility features
 */
export function useAccessibility(
  containerRef?: React.RefObject<HTMLElement>,
  options: Partial<FocusManagementOptions> = {}
) {
  const { trapFocus = false, restoreFocus = true, skipLinks = true } = options
  const { playerState } = useMediaPlayer()
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(defaultPreferences)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const focusableElementsRef = useRef<HTMLElement[]>([])

  // Detect user preferences from system
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')

    const updatePreferences = () => {
      setPreferences((prev) => ({
        ...prev,
        reduceMotion: mediaQuery.matches,
        highContrast: contrastQuery.matches,
      }))
    }

    // Initial check
    updatePreferences()

    // Listen for changes
    mediaQuery.addEventListener('change', updatePreferences)
    contrastQuery.addEventListener('change', updatePreferences)

    return () => {
      mediaQuery.removeEventListener('change', updatePreferences)
      contrastQuery.removeEventListener('change', updatePreferences)
    }
  }, [])

  // Get focusable elements within container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef?.current) return []

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ')

    const elements = Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]

    return elements.filter((el) => {
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
  }, [containerRef])

  // Update focusable elements list
  const updateFocusableElements = useCallback(() => {
    focusableElementsRef.current = getFocusableElements()
  }, [getFocusableElements])

  // Focus management
  const manageFocus = useCallback(
    (direction: 'first' | 'last' | 'next' | 'previous' | HTMLElement) => {
      if (!preferences.focusManagement || !containerRef?.current) return

      updateFocusableElements()
      const elements = focusableElementsRef.current

      if (elements.length === 0) return

      if (typeof direction === 'object') {
        // Focus specific element
        direction.focus()
        return
      }

      const currentIndex = elements.indexOf(document.activeElement as HTMLElement)

      switch (direction) {
        case 'first':
          elements[0]?.focus()
          break
        case 'last':
          elements[elements.length - 1]?.focus()
          break
        case 'next':
          if (currentIndex >= 0 && currentIndex < elements.length - 1) {
            elements[currentIndex + 1]?.focus()
          } else {
            elements[0]?.focus() // Wrap to first
          }
          break
        case 'previous':
          if (currentIndex > 0) {
            elements[currentIndex - 1]?.focus()
          } else {
            elements[elements.length - 1]?.focus() // Wrap to last
          }
          break
      }
    },
    [preferences.focusManagement, containerRef, updateFocusableElements]
  )

  // Trap focus within container
  useEffect(() => {
    if (!trapFocus || !containerRef?.current || !preferences.focusManagement) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      updateFocusableElements()
      const elements = focusableElementsRef.current

      if (elements.length === 0) return

      const firstElement = elements[0]
      const lastElement = elements[elements.length - 1]
      const activeElement = document.activeElement as HTMLElement

      if (event.shiftKey) {
        // Shift + Tab (backward)
        if (activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab (forward)
        if (activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [trapFocus, containerRef, preferences.focusManagement, updateFocusableElements])

  // Store and restore focus
  const storeFocus = useCallback(() => {
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement
    }
  }, [restoreFocus])

  const restorePreviousFocus = useCallback(() => {
    if (restoreFocus && previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [restoreFocus])

  // Announce state changes to screen readers
  const announceStateChange = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (!preferences.announceStateChanges) return

      // Create or update ARIA live region
      let liveRegion = document.getElementById(`media-player-status-${priority}`)
      if (!liveRegion) {
        liveRegion = document.createElement('div')
        liveRegion.id = `media-player-status-${priority}`
        liveRegion.setAttribute('aria-live', priority)
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.style.position = 'absolute'
        liveRegion.style.left = '-10000px'
        liveRegion.style.width = '1px'
        liveRegion.style.height = '1px'
        liveRegion.style.overflow = 'hidden'
        document.body.appendChild(liveRegion)
      }

      // Clear previous content and announce new message
      liveRegion.textContent = ''
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = message
        }
      }, 100)
    },
    [preferences.announceStateChanges]
  )

  // Generate ARIA attributes for player elements
  const getAriaAttributes = useCallback(
    (elementType: 'player' | 'controls' | 'progress' | 'volume' | 'button') => {
      const baseAttributes: Record<string, string | number | boolean> = {}

      switch (elementType) {
        case 'player':
          return {
            ...baseAttributes,
            'role': 'application',
            'aria-label': playerState.currentMedia
              ? `Media player: ${playerState.currentMedia.title}`
              : 'Media player',
            'aria-describedby': 'media-player-instructions',
          }

        case 'controls':
          return {
            ...baseAttributes,
            'role': 'toolbar',
            'aria-label': 'Media player controls',
            'aria-orientation': 'horizontal',
          }

        case 'progress':
          return {
            ...baseAttributes,
            'role': 'slider',
            'aria-label': 'Seek slider',
            'aria-valuemin': 0,
            'aria-valuemax': playerState.duration || 100,
            'aria-valuenow': playerState.currentTime || 0,
            'aria-valuetext': `${formatTime(playerState.currentTime)} of ${formatTime(playerState.duration)}`,
          }

        case 'volume':
          return {
            ...baseAttributes,
            'role': 'slider',
            'aria-label': 'Volume slider',
            'aria-valuemin': 0,
            'aria-valuemax': 100,
            'aria-valuenow': Math.round(playerState.volume * 100),
            'aria-valuetext': `${Math.round(playerState.volume * 100)}%`,
          }

        case 'button':
          return {
            ...baseAttributes,
            'aria-pressed': undefined, // Will be set by specific button
          }

        default:
          return baseAttributes
      }
    },
    [playerState]
  )

  // Get CSS classes for accessibility preferences
  const getAccessibilityClasses = useCallback(() => {
    const classes: string[] = []

    if (preferences.reduceMotion) {
      classes.push('reduce-motion')
    }

    if (preferences.highContrast) {
      classes.push('high-contrast')
    }

    if (!preferences.keyboardNavigation) {
      classes.push('no-keyboard-nav')
    }

    return classes.join(' ')
  }, [preferences])

  // Skip link functionality
  const createSkipLink = useCallback(
    (targetId: string, label: string) => {
      if (!skipLinks) return null

      return {
        href: `#${targetId}`,
        className: 'skip-link',
        onClick: (e: React.MouseEvent) => {
          e.preventDefault()
          const target = document.getElementById(targetId)
          if (target) {
            target.focus()
            target.scrollIntoView({ behavior: preferences.reduceMotion ? 'auto' : 'smooth' })
          }
        },
        children: label,
      }
    },
    [skipLinks, preferences.reduceMotion]
  )

  // Announce player state changes
  useEffect(() => {
    if (!playerState.currentMedia) return

    if (playerState.isPlaying) {
      announceStateChange(`Playing ${playerState.currentMedia.title}`)
    } else if (playerState.currentTime > 0) {
      announceStateChange(`Paused ${playerState.currentMedia.title}`)
    }
  }, [playerState.isPlaying, playerState.currentMedia, announceStateChange])

  // Announce errors
  useEffect(() => {
    if (playerState.error) {
      announceStateChange(`Error: ${playerState.error}`, 'assertive')
    }
  }, [playerState.error, announceStateChange])

  // Announce loading state
  useEffect(() => {
    if (playerState.isLoading && playerState.currentMedia) {
      announceStateChange(`Loading ${playerState.currentMedia.title}`)
    }
  }, [playerState.isLoading, playerState.currentMedia, announceStateChange])

  return {
    preferences,
    setPreferences,
    manageFocus,
    storeFocus,
    restorePreviousFocus,
    announceStateChange,
    getAriaAttributes,
    getAccessibilityClasses,
    createSkipLink,
    updateFocusableElements,
  }
}

// Helper function to format time for ARIA
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}
