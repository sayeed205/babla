/**
 * Media Player Store
 * Zustand store for managing media player state and actions
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  ErrorRecoveryStrategy,
  ErrorState,
  MediaItem,
  MediaPlayerErrorType,
  NetworkError,
  PlayerConfig,
  PlayerState,
} from '../types'

// Store interface definition
export interface MediaPlayerStore {
  // State
  playerState: PlayerState
  config: PlayerConfig
  queue: MediaItem[]
  currentIndex: number
  errorState: ErrorState

  // Playback actions
  playMedia: (media: MediaItem) => void
  pause: () => void
  resume: () => void
  stop: () => void
  seek: (time: number) => void

  // Volume and playback controls
  setVolume: (volume: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void

  // Display controls
  toggleFullscreen: () => void
  togglePictureInPicture: () => void

  // Queue management
  addToQueue: (media: MediaItem) => void
  removeFromQueue: (index: number) => void
  playNext: () => void
  playPrevious: () => void
  clearQueue: () => void
  setCurrentIndex: (index: number) => void

  // Configuration
  updateConfig: (config: Partial<PlayerConfig>) => void

  // State management
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (isPlaying: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setIsFullscreen: (isFullscreen: boolean) => void
  setIsPictureInPicture: (isPictureInPicture: boolean) => void

  // Enhanced error handling
  setError: (error: MediaPlayerErrorType | string | null) => void
  clearError: () => void
  retryLastAction: () => Promise<void>
  handleRecovery: (strategy: ErrorRecoveryStrategy) => Promise<void>
}

// Default player state
const defaultPlayerState: PlayerState = {
  currentMedia: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  isFullscreen: false,
  isPictureInPicture: false,
  isLoading: false,
  error: null,
  playbackRate: 1,
}

// Default player configuration
const defaultPlayerConfig: PlayerConfig = {
  autoplay: false,
  controls: true,
  loop: false,
  preload: 'metadata',
  volume: 1,
  playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
  keyboard: true,
  tooltips: true,
}

// Default error state
const defaultErrorState: ErrorState = {
  hasError: false,
  error: null,
  recoveryStrategy: null,
  isRecovering: false,
  retryCount: 0,
}

// Create the store
export const useMediaPlayerStore = create<MediaPlayerStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      playerState: defaultPlayerState,
      config: defaultPlayerConfig,
      queue: [],
      currentIndex: -1,
      errorState: defaultErrorState,

      // Playback actions
      playMedia: (media: MediaItem) => {
        console.log('playMedia called with:', media)
        set((state) => {
          // Check if media is already in queue
          const existingIndex = state.queue.findIndex((item) => item.id === media.id)

          if (existingIndex !== -1) {
            // Media is in queue, just switch to it
            console.log('Media already in queue, switching to index:', existingIndex)
            return {
              currentIndex: existingIndex,
              playerState: {
                ...state.playerState,
                currentMedia: media,
                isPlaying: true,
                isLoading: true,
                error: null,
                currentTime: 0,
              },
            }
          } else {
            // Add media to queue and play it
            const newQueue = [...state.queue, media]
            console.log('Adding media to queue, new queue:', newQueue)
            return {
              queue: newQueue,
              currentIndex: newQueue.length - 1,
              playerState: {
                ...state.playerState,
                currentMedia: media,
                isPlaying: true,
                isLoading: true,
                error: null,
                currentTime: 0,
              },
            }
          }
        })
      },

      pause: () => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isPlaying: false,
          },
        }))
      },

      resume: () => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isPlaying: true,
          },
        }))
      },

      stop: () => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isPlaying: false,
            currentTime: 0,
            currentMedia: null,
          },
          currentIndex: -1,
        }))
      },

      seek: (time: number) => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            currentTime: Math.max(0, Math.min(time, state.playerState.duration)),
          },
        }))
      },

      // Volume and playback controls
      setVolume: (volume: number) => {
        const clampedVolume = Math.max(0, Math.min(1, volume))
        set((state) => ({
          playerState: {
            ...state.playerState,
            volume: clampedVolume,
            isMuted: clampedVolume === 0,
          },
          config: {
            ...state.config,
            volume: clampedVolume,
          },
        }))
      },

      toggleMute: () => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isMuted: !state.playerState.isMuted,
          },
        }))
      },

      setPlaybackRate: (rate: number) => {
        // Ensure rate is one of the allowed rates
        const { config } = get()
        const validRate = config.playbackRates.includes(rate) ? rate : 1

        set((state) => ({
          playerState: {
            ...state.playerState,
            playbackRate: validRate,
          },
        }))
      },

      // Display controls
      toggleFullscreen: () => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isFullscreen: !state.playerState.isFullscreen,
          },
        }))
      },

      togglePictureInPicture: () => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isPictureInPicture: !state.playerState.isPictureInPicture,
          },
        }))
      },

      // Queue management
      addToQueue: (media: MediaItem) => {
        set((state) => {
          // Check if media is already in queue
          const existingIndex = state.queue.findIndex((item) => item.id === media.id)

          if (existingIndex === -1) {
            return {
              queue: [...state.queue, media],
            }
          }

          // Media already in queue, don't add duplicate
          return state
        })
      },

      removeFromQueue: (index: number) => {
        set((state) => {
          if (index < 0 || index >= state.queue.length) {
            return state
          }

          const newQueue = state.queue.filter((_, i) => i !== index)
          let newCurrentIndex = state.currentIndex

          if (index === state.currentIndex) {
            // Removing currently playing item
            if (newQueue.length === 0) {
              // Queue is empty, stop playback
              return {
                queue: newQueue,
                currentIndex: -1,
                playerState: {
                  ...state.playerState,
                  currentMedia: null,
                  isPlaying: false,
                  currentTime: 0,
                },
              }
            } else if (index < newQueue.length) {
              // Play the item that took the removed item's place
              const newCurrentMedia = newQueue[index]
              return {
                queue: newQueue,
                currentIndex: index,
                playerState: {
                  ...state.playerState,
                  currentMedia: newCurrentMedia,
                  currentTime: 0,
                  isLoading: true,
                },
              }
            } else {
              // Removed last item, play previous
              newCurrentIndex = newQueue.length - 1
              const newCurrentMedia = newQueue[newCurrentIndex]
              return {
                queue: newQueue,
                currentIndex: newCurrentIndex,
                playerState: {
                  ...state.playerState,
                  currentMedia: newCurrentMedia,
                  currentTime: 0,
                  isLoading: true,
                },
              }
            }
          } else if (index < state.currentIndex) {
            // Removed item before current, adjust index
            newCurrentIndex = state.currentIndex - 1
          }

          return {
            queue: newQueue,
            currentIndex: newCurrentIndex,
          }
        })
      },

      playNext: () => {
        set((state) => {
          const { queue, currentIndex } = state

          if (queue.length === 0) {
            return state
          }

          const nextIndex = (currentIndex + 1) % queue.length
          const nextMedia = queue[nextIndex]

          return {
            currentIndex: nextIndex,
            playerState: {
              ...state.playerState,
              currentMedia: nextMedia,
              isPlaying: true,
              isLoading: true,
              currentTime: 0,
              error: null,
            },
          }
        })
      },

      playPrevious: () => {
        set((state) => {
          const { queue, currentIndex } = state

          if (queue.length === 0) {
            return state
          }

          const prevIndex = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1
          const prevMedia = queue[prevIndex]

          return {
            currentIndex: prevIndex,
            playerState: {
              ...state.playerState,
              currentMedia: prevMedia,
              isPlaying: true,
              isLoading: true,
              currentTime: 0,
              error: null,
            },
          }
        })
      },

      clearQueue: () => {
        set((state) => ({
          queue: [],
          currentIndex: -1,
          playerState: {
            ...state.playerState,
            currentMedia: null,
            isPlaying: false,
            currentTime: 0,
          },
        }))
      },

      setCurrentIndex: (index: number) => {
        set((state) => {
          const { queue } = state

          if (index < 0 || index >= queue.length) {
            return state
          }

          const media = queue[index]
          return {
            currentIndex: index,
            playerState: {
              ...state.playerState,
              currentMedia: media,
              isPlaying: true,
              isLoading: true,
              currentTime: 0,
              error: null,
            },
          }
        })
      },

      // Configuration
      updateConfig: (configUpdate: Partial<PlayerConfig>) => {
        set((state) => ({
          config: {
            ...state.config,
            ...configUpdate,
          },
        }))
      },

      // State management helpers
      setCurrentTime: (time: number) => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            currentTime: Math.max(0, time),
          },
        }))
      },

      setDuration: (duration: number) => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            duration: Math.max(0, duration),
          },
        }))
      },

      setIsPlaying: (isPlaying: boolean) => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isPlaying,
          },
        }))
      },

      setIsLoading: (isLoading: boolean) => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isLoading,
          },
        }))
      },

      setIsFullscreen: (isFullscreen: boolean) => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isFullscreen,
          },
        }))
      },

      setIsPictureInPicture: (isPictureInPicture: boolean) => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            isPictureInPicture,
          },
        }))
      },

      // Enhanced error handling
      setError: (error: MediaPlayerErrorType | string | null) => {
        if (!error) {
          set((state) => ({
            playerState: {
              ...state.playerState,
              error: null,
            },
            errorState: defaultErrorState,
          }))
          return
        }

        // Handle string errors (legacy support)
        if (typeof error === 'string') {
          set((state) => ({
            playerState: {
              ...state.playerState,
              error,
              isLoading: false,
            },
            errorState: {
              hasError: true,
              error: {
                id: `error-${Date.now()}`,
                category: 'network',
                severity: 'medium',
                message: error,
                timestamp: Date.now(),
                recoverable: true,
                retryable: true,
              } as NetworkError,
              recoveryStrategy: {
                canRecover: true,
                recoveryAction: 'retry',
                maxRetries: 3,
                retryDelay: 2000,
                userMessage: 'Something went wrong. Would you like to try again?',
                actionLabel: 'Retry',
              },
              isRecovering: false,
              retryCount: 0,
            },
          }))
          return
        }

        // Handle structured errors
        const recoveryStrategy = getRecoveryStrategy(error)
        set((state) => ({
          playerState: {
            ...state.playerState,
            error: error.message,
            isLoading: false,
          },
          errorState: {
            hasError: true,
            error,
            recoveryStrategy,
            isRecovering: false,
            retryCount: 0,
          },
        }))
      },

      clearError: () => {
        set((state) => ({
          playerState: {
            ...state.playerState,
            error: null,
          },
          errorState: defaultErrorState,
        }))
      },

      retryLastAction: async () => {
        const { errorState, playerState } = get()

        if (!errorState.hasError || !errorState.recoveryStrategy?.canRecover) {
          return
        }

        const maxRetries = errorState.recoveryStrategy.maxRetries || 3
        if (errorState.retryCount >= maxRetries) {
          return
        }

        set((state) => ({
          errorState: {
            ...state.errorState,
            isRecovering: true,
            retryCount: state.errorState.retryCount + 1,
          },
        }))

        try {
          // Add retry delay
          if (errorState.recoveryStrategy?.retryDelay) {
            await new Promise((resolve) =>
              setTimeout(resolve, errorState.recoveryStrategy!.retryDelay)
            )
          }

          // Clear error and retry the last action
          get().clearError()

          // If there was a current media, try to play it again
          if (playerState.currentMedia) {
            get().playMedia(playerState.currentMedia)
          }
        } catch (retryError) {
          // If retry fails, set a new error
          get().setError(typeof retryError === 'string' ? retryError : 'Retry failed')
        }
      },

      handleRecovery: async (strategy: ErrorRecoveryStrategy) => {
        const { errorState } = get()

        if (!errorState.hasError) {
          return
        }

        set((state) => ({
          errorState: {
            ...state.errorState,
            isRecovering: true,
          },
        }))

        try {
          switch (strategy.recoveryAction) {
            case 'retry':
              await get().retryLastAction()
              break
            case 'refresh_url':
              // This would be handled by the streaming service
              get().clearError()
              break
            case 'fallback':
              // Implement fallback logic (e.g., lower quality)
              get().clearError()
              break
            case 'user_action':
              // Clear error and wait for user action
              get().clearError()
              break
            case 'none':
            default:
              get().clearError()
              break
          }
        } catch (recoveryError) {
          get().setError(typeof recoveryError === 'string' ? recoveryError : 'Recovery failed')
        }
      },
    }),
    {
      name: 'media-player-store',
    }
  )
)

/**
 * Get recovery strategy for different error types
 */
function getRecoveryStrategy(error: MediaPlayerErrorType): ErrorRecoveryStrategy {
  switch (error.category) {
    case 'network':
      return {
        canRecover: true,
        recoveryAction: 'retry',
        maxRetries: 3,
        retryDelay: 2000,
        userMessage: 'Network connection failed. Check your internet connection and try again.',
        actionLabel: 'Retry',
      }

    case 'authentication':
      const authError = error as any
      return {
        canRecover: authError.requiresLogin,
        recoveryAction: 'user_action',
        userMessage: authError.requiresLogin
          ? 'Please log in to continue watching.'
          : 'Authentication failed. Please refresh the page and try again.',
        actionLabel: authError.requiresLogin ? 'Log In' : 'Refresh',
      }

    case 'media_format':
      return {
        canRecover: true,
        recoveryAction: 'fallback',
        userMessage: 'This media format is not supported. Trying alternative format...',
        actionLabel: 'Try Alternative',
      }

    case 'signed_url':
      return {
        canRecover: true,
        recoveryAction: 'refresh_url',
        maxRetries: 2,
        retryDelay: 1000,
        userMessage: 'Media link expired. Refreshing...',
        actionLabel: 'Refresh',
      }

    case 'player_library':
      return {
        canRecover: true,
        recoveryAction: 'fallback',
        userMessage: 'Player error occurred. Trying fallback player...',
        actionLabel: 'Use Fallback',
      }

    case 'permission':
      return {
        canRecover: false,
        recoveryAction: 'none',
        userMessage: 'You do not have permission to access this content.',
        actionLabel: 'OK',
      }

    default:
      return {
        canRecover: true,
        recoveryAction: 'retry',
        maxRetries: 2,
        retryDelay: 2000,
        userMessage: 'An unexpected error occurred. Would you like to try again?',
        actionLabel: 'Retry',
      }
  }
}

// Selector hooks for common state access patterns
export const usePlayerState = () => useMediaPlayerStore((state) => state.playerState)
export const usePlayerConfig = () => useMediaPlayerStore((state) => state.config)
export const useQueue = () => useMediaPlayerStore((state) => state.queue)
export const useCurrentIndex = () => useMediaPlayerStore((state) => state.currentIndex)
export const useCurrentMedia = () => useMediaPlayerStore((state) => state.playerState.currentMedia)
export const useIsPlaying = () => useMediaPlayerStore((state) => state.playerState.isPlaying)
export const useIsLoading = () => useMediaPlayerStore((state) => state.playerState.isLoading)
export const usePlayerError = () => useMediaPlayerStore((state) => state.playerState.error)
export const useErrorState = () => useMediaPlayerStore((state) => state.errorState)
