/**
 * Media validation utilities
 * Functions to validate media items and their properties
 */

import type {
  MediaItem,
  MediaType,
  MovieMediaItem,
  MusicMediaItem,
  TVMediaItem,
} from '../types/media-player-types'

/**
 * Validation error class for media-related validation failures
 */
export class MediaValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message)
    this.name = 'MediaValidationError'
  }
}

/**
 * Validates basic MediaItem properties
 * Checks that required fields are present and valid
 */
export function validateBaseMediaItem(item: any): item is MediaItem {
  if (!item || typeof item !== 'object') {
    throw new MediaValidationError('Media item must be an object')
  }

  if (!item.id || typeof item.id !== 'string' || item.id.trim() === '') {
    throw new MediaValidationError('Media item must have a valid id', 'id', item.id)
  }

  if (!item.type || !['movie', 'tv', 'music'].includes(item.type)) {
    throw new MediaValidationError(
      'Media item must have a valid type (movie, tv, or music)',
      'type',
      item.type
    )
  }

  if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
    throw new MediaValidationError('Media item must have a valid title', 'title', item.title)
  }

  // Optional fields validation
  if (item.duration !== undefined && (typeof item.duration !== 'number' || item.duration < 0)) {
    throw new MediaValidationError('Duration must be a positive number', 'duration', item.duration)
  }

  if (
    item.thumbnail !== undefined &&
    (typeof item.thumbnail !== 'string' || item.thumbnail.trim() === '')
  ) {
    throw new MediaValidationError(
      'Thumbnail must be a non-empty string',
      'thumbnail',
      item.thumbnail
    )
  }

  return true
}

/**
 * Validates MovieMediaItem specific properties
 */
export function validateMovieMediaItem(item: any): item is MovieMediaItem {
  validateBaseMediaItem(item)

  if (item.type !== 'movie') {
    throw new MediaValidationError(
      'Item type must be "movie" for MovieMediaItem',
      'type',
      item.type
    )
  }

  // Optional movie-specific fields
  if (
    item.releaseYear !== undefined &&
    (typeof item.releaseYear !== 'number' ||
      item.releaseYear < 1800 ||
      item.releaseYear > new Date().getFullYear() + 10)
  ) {
    throw new MediaValidationError(
      'Release year must be a valid year',
      'releaseYear',
      item.releaseYear
    )
  }

  if (item.genres !== undefined) {
    if (!Array.isArray(item.genres)) {
      throw new MediaValidationError('Genres must be an array', 'genres', item.genres)
    }

    for (const genre of item.genres) {
      if (typeof genre !== 'string' || genre.trim() === '') {
        throw new MediaValidationError('Each genre must be a non-empty string', 'genres', genre)
      }
    }
  }

  return true
}

/**
 * Validates TVMediaItem specific properties
 */
export function validateTVMediaItem(item: any): item is TVMediaItem {
  validateBaseMediaItem(item)

  if (item.type !== 'tv') {
    throw new MediaValidationError('Item type must be "tv" for TVMediaItem', 'type', item.type)
  }

  // Optional TV-specific fields
  if (
    item.seasonNumber !== undefined &&
    (typeof item.seasonNumber !== 'number' || item.seasonNumber < 0)
  ) {
    throw new MediaValidationError(
      'Season number must be a non-negative number',
      'seasonNumber',
      item.seasonNumber
    )
  }

  if (
    item.episodeNumber !== undefined &&
    (typeof item.episodeNumber !== 'number' || item.episodeNumber < 0)
  ) {
    throw new MediaValidationError(
      'Episode number must be a non-negative number',
      'episodeNumber',
      item.episodeNumber
    )
  }

  if (
    item.seriesTitle !== undefined &&
    (typeof item.seriesTitle !== 'string' || item.seriesTitle.trim() === '')
  ) {
    throw new MediaValidationError(
      'Series title must be a non-empty string',
      'seriesTitle',
      item.seriesTitle
    )
  }

  // If episode number is provided, season number should also be provided
  if (item.episodeNumber !== undefined && item.seasonNumber === undefined) {
    throw new MediaValidationError('Season number is required when episode number is provided')
  }

  return true
}

/**
 * Validates MusicMediaItem specific properties
 */
export function validateMusicMediaItem(item: any): item is MusicMediaItem {
  validateBaseMediaItem(item)

  if (item.type !== 'music') {
    throw new MediaValidationError(
      'Item type must be "music" for MusicMediaItem',
      'type',
      item.type
    )
  }

  // Optional music-specific fields
  if (item.artist !== undefined && (typeof item.artist !== 'string' || item.artist.trim() === '')) {
    throw new MediaValidationError('Artist must be a non-empty string', 'artist', item.artist)
  }

  if (item.album !== undefined && (typeof item.album !== 'string' || item.album.trim() === '')) {
    throw new MediaValidationError('Album must be a non-empty string', 'album', item.album)
  }

  if (
    item.albumArt !== undefined &&
    (typeof item.albumArt !== 'string' || item.albumArt.trim() === '')
  ) {
    throw new MediaValidationError(
      'Album art must be a non-empty string',
      'albumArt',
      item.albumArt
    )
  }

  return true
}

/**
 * Validates a MediaItem based on its type
 * Automatically determines the appropriate validation function
 */
export function validateMediaItem(item: any): item is MediaItem {
  validateBaseMediaItem(item)

  switch (item.type) {
    case 'movie':
      return validateMovieMediaItem(item)
    case 'tv':
      return validateTVMediaItem(item)
    case 'music':
      return validateMusicMediaItem(item)
    default:
      throw new MediaValidationError(`Unknown media type: ${item.type}`, 'type', item.type)
  }
}

/**
 * Validates an array of MediaItems
 * Returns validation results for each item
 */
export function validateMediaItems(items: any[]): {
  valid: MediaItem[]
  invalid: Array<{ item: any; error: MediaValidationError }>
} {
  const valid: MediaItem[] = []
  const invalid: Array<{ item: any; error: MediaValidationError }> = []

  for (const item of items) {
    try {
      if (validateMediaItem(item)) {
        valid.push(item)
      }
    } catch (error) {
      invalid.push({
        item,
        error:
          error instanceof MediaValidationError
            ? error
            : new MediaValidationError((error as Error)?.message || 'Unknown validation error'),
      })
    }
  }

  return { valid, invalid }
}

/**
 * Validates media type string
 */
export function validateMediaType(type: any): type is MediaType {
  return typeof type === 'string' && ['movie', 'tv', 'music'].includes(type)
}

/**
 * Validates URL format
 * Used for validating thumbnail URLs, streaming URLs, etc.
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validates that a URL is an image URL
 * Used for validating thumbnail and album art URLs
 */
export function validateImageUrl(url: string): boolean {
  if (!validateUrl(url)) {
    return false
  }

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp']
  const lowercaseUrl = url.toLowerCase()

  return (
    imageExtensions.some((ext) => lowercaseUrl.includes(ext)) ||
    lowercaseUrl.includes('image') ||
    lowercaseUrl.includes('tmdb.org') || // TMDB image URLs
    lowercaseUrl.includes('fanart.tv')
  ) // Fanart.tv image URLs
}

/**
 * Sanitizes a MediaItem by removing invalid properties
 * Returns a clean MediaItem with only valid properties
 */
export function sanitizeMediaItem(item: any): MediaItem | null {
  try {
    // Create a base clean item
    const cleanItem: any = {
      id: typeof item.id === 'string' ? item.id.trim() : '',
      type: validateMediaType(item.type) ? item.type : null,
      title: typeof item.title === 'string' ? item.title.trim() : '',
    }

    // Validate required fields
    if (!cleanItem.id || !cleanItem.type || !cleanItem.title) {
      return null
    }

    // Add optional base fields
    if (typeof item.duration === 'number' && item.duration >= 0) {
      cleanItem.duration = item.duration
    }

    if (typeof item.thumbnail === 'string' && validateImageUrl(item.thumbnail)) {
      cleanItem.thumbnail = item.thumbnail.trim()
    }

    if (item.metadata && typeof item.metadata === 'object') {
      cleanItem.metadata = item.metadata
    }

    // Add type-specific fields
    switch (cleanItem.type) {
      case 'movie':
        if (typeof item.releaseYear === 'number' && item.releaseYear >= 1800) {
          cleanItem.releaseYear = item.releaseYear
        }
        if (Array.isArray(item.genres)) {
          cleanItem.genres = item.genres.filter(
            (g: any) => typeof g === 'string' && g.trim() !== ''
          )
        }
        break

      case 'tv':
        if (typeof item.seasonNumber === 'number' && item.seasonNumber >= 0) {
          cleanItem.seasonNumber = item.seasonNumber
        }
        if (typeof item.episodeNumber === 'number' && item.episodeNumber >= 0) {
          cleanItem.episodeNumber = item.episodeNumber
        }
        if (typeof item.seriesTitle === 'string' && item.seriesTitle.trim() !== '') {
          cleanItem.seriesTitle = item.seriesTitle.trim()
        }
        break

      case 'music':
        if (typeof item.artist === 'string' && item.artist.trim() !== '') {
          cleanItem.artist = item.artist.trim()
        }
        if (typeof item.album === 'string' && item.album.trim() !== '') {
          cleanItem.album = item.album.trim()
        }
        if (typeof item.albumArt === 'string' && validateImageUrl(item.albumArt)) {
          cleanItem.albumArt = item.albumArt.trim()
        }
        break
    }

    // Final validation
    return validateMediaItem(cleanItem) ? cleanItem : null
  } catch {
    return null
  }
}

/**
 * Checks if a MediaItem has all required properties for playback
 * Used to determine if an item is ready to be played
 */
export function isPlayableMediaItem(item: MediaItem): boolean {
  try {
    validateMediaItem(item)

    // Additional playback readiness checks
    // For now, just ensure basic validation passes
    // In the future, this could check for streaming URL availability, etc.

    return true
  } catch {
    return false
  }
}
