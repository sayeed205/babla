/**
 * Utility types for media player type checking and validation
 */

import type {
  MediaItem,
  MediaType,
  MovieMediaItem,
  MusicMediaItem,
  TVMediaItem,
} from './media-player-types'

// Type guards for media items
export const isMovieMediaItem = (item: MediaItem): item is MovieMediaItem => {
  return item.type === 'movie'
}

export const isTVMediaItem = (item: MediaItem): item is TVMediaItem => {
  return item.type === 'tv'
}

export const isMusicMediaItem = (item: MediaItem): item is MusicMediaItem => {
  return item.type === 'music'
}

// Type guard for media type validation
export const isValidMediaType = (type: string): type is MediaType => {
  return ['movie', 'tv', 'music'].includes(type)
}

// Utility type for partial updates
export type PartialPlayerState = Partial<import('./media-player-types').PlayerState>

// Utility type for media item creation
export type CreateMediaItemParams<T extends MediaType> = T extends 'movie'
  ? Omit<MovieMediaItem, 'type'> & { type: 'movie' }
  : T extends 'tv'
    ? Omit<TVMediaItem, 'type'> & { type: 'tv' }
    : T extends 'music'
      ? Omit<MusicMediaItem, 'type'> & { type: 'music' }
      : never

// Utility type for required media item fields
export type RequiredMediaFields = Pick<MediaItem, 'id' | 'type' | 'title'>

// Utility type for optional media item fields
export type OptionalMediaFields = Omit<MediaItem, keyof RequiredMediaFields>
