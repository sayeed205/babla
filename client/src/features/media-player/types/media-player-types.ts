/**
 * Core media player types and interfaces
 * Defines the foundational types for the media player system
 */

// Media type enumeration
export type MediaType = 'movie' | 'tv' | 'music'

// Base media item interface
export interface BaseMediaItem {
  id: string
  type: MediaType
  title: string
  duration?: number
  thumbnail?: string
  metadata?: Record<string, any>
}

// Specific media item types
export interface MovieMediaItem extends BaseMediaItem {
  type: 'movie'
  releaseYear?: number
  genres?: string[]
}

export interface TVMediaItem extends BaseMediaItem {
  type: 'tv'
  seasonNumber?: number
  episodeNumber?: number
  seriesTitle?: string
}

export interface MusicMediaItem extends BaseMediaItem {
  type: 'music'
  artist?: string
  album?: string
  albumArt?: string
}

// Union type for all media items
export type MediaItem = MovieMediaItem | TVMediaItem | MusicMediaItem

// Player state interface
export interface PlayerState {
  currentMedia: MediaItem | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  isPictureInPicture: boolean
  isLoading: boolean
  error: string | null
  playbackRate: number
}

// Player configuration interface
export interface PlayerConfig {
  autoplay: boolean
  controls: boolean
  loop: boolean
  preload: 'none' | 'metadata' | 'auto'
  volume: number
  playbackRates: number[]
  keyboard: boolean
  tooltips: boolean
}
