/**
 * Player event types and handlers
 * Defines the event system for media player interactions
 */

import type { MediaItem } from './media-player-types'

// Player event handlers
export interface PlayerEvents {
  onPlay: (media: MediaItem) => void
  onPause: () => void
  onEnded: () => void
  onTimeUpdate: (currentTime: number) => void
  onDurationChange: (duration: number) => void
  onVolumeChange: (volume: number) => void
  onError: (error: Error) => void
  onLoadStart: () => void
  onLoadedData: () => void
  onSeeking: () => void
  onSeeked: () => void
  onFullscreenChange: (isFullscreen: boolean) => void
  onPictureInPictureChange: (isPiP: boolean) => void
  onPlaybackRateChange: (rate: number) => void
}

// Event data structures
export interface PlayEvent {
  media: MediaItem
  timestamp: number
  autoplay: boolean
}

export interface TimeUpdateEvent {
  currentTime: number
  duration: number
  progress: number // 0-1
  timestamp: number
}

export interface VolumeChangeEvent {
  volume: number
  isMuted: boolean
  timestamp: number
}

export interface ErrorEvent {
  error: Error
  media: MediaItem | null
  timestamp: number
  recoverable: boolean
}

export interface LoadingEvent {
  media: MediaItem
  loadingState: 'start' | 'progress' | 'complete' | 'error'
  progress?: number
  timestamp: number
}

// Event listener types
export type PlayerEventListener<T = any> = (event: T) => void

// Event emitter interface
export interface PlayerEventEmitter {
  on<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): void
  off<K extends keyof PlayerEvents>(event: K, listener: PlayerEvents[K]): void
  emit<K extends keyof PlayerEvents>(event: K, ...args: Parameters<PlayerEvents[K]>): void
}
