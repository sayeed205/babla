/**
 * Media type detection utilities
 * Functions to detect and determine media types from various data sources
 */

import type { MediaType } from '../types/media-player-types'

/**
 * Detects media type from MIME type
 * Used when determining media type from file metadata
 */
export function detectMediaTypeFromMimeType(mimeType: string): MediaType | null {
  const normalizedMimeType = mimeType.toLowerCase()

  // Video MIME types
  if (normalizedMimeType.startsWith('video/')) {
    // For now, we'll assume all video content is movies
    // In the future, this could be enhanced to distinguish between movies and TV
    return 'movie'
  }

  // Audio MIME types
  if (normalizedMimeType.startsWith('audio/')) {
    return 'music'
  }

  // Specific video formats
  const videoFormats = [
    'application/x-mpegurl', // HLS
    'application/vnd.apple.mpegurl', // HLS
    'application/dash+xml', // DASH
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-ms-wmv',
  ]

  if (videoFormats.some((format) => normalizedMimeType.includes(format))) {
    return 'movie'
  }

  // Specific audio formats
  const audioFormats = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/x-ms-wma',
  ]

  if (audioFormats.some((format) => normalizedMimeType.includes(format))) {
    return 'music'
  }

  return null
}

/**
 * Detects media type from file extension
 * Used as a fallback when MIME type is not available
 */
export function detectMediaTypeFromExtension(filename: string): MediaType | null {
  const extension = filename.toLowerCase().split('.').pop()

  if (!extension) {
    return null
  }

  // Video extensions
  const videoExtensions = [
    'mp4',
    'avi',
    'mkv',
    'mov',
    'wmv',
    'flv',
    'webm',
    'ogg',
    'm4v',
    'mpg',
    'mpeg',
    '3gp',
    'ts',
    'mts',
    'm2ts',
    'vob',
    'rm',
    'rmvb',
  ]

  if (videoExtensions.includes(extension)) {
    return 'movie'
  }

  // Audio extensions
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'aiff', 'au']

  if (audioExtensions.includes(extension)) {
    return 'music'
  }

  return null
}

/**
 * Detects media type from URL path
 * Used when analyzing streaming URLs or file paths
 */
export function detectMediaTypeFromUrl(url: string): MediaType | null {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.toLowerCase()

    // Check for common video streaming patterns
    if (pathname.includes('/movies/') || pathname.includes('/movie/')) {
      return 'movie'
    }

    if (
      pathname.includes('/tv/') ||
      pathname.includes('/shows/') ||
      pathname.includes('/episodes/') ||
      pathname.includes('/series/')
    ) {
      return 'tv'
    }

    if (
      pathname.includes('/music/') ||
      pathname.includes('/audio/') ||
      pathname.includes('/songs/') ||
      pathname.includes('/tracks/')
    ) {
      return 'music'
    }

    // Fallback to extension detection
    return detectMediaTypeFromExtension(pathname)
  } catch {
    // If URL parsing fails, try extension detection on the original string
    return detectMediaTypeFromExtension(url)
  }
}

/**
 * Detects media type from data structure
 * Used when analyzing API response data or object properties
 */
export function detectMediaTypeFromData(data: any): MediaType | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  // Check for explicit type property
  if (data.type && ['movie', 'tv', 'music'].includes(data.type)) {
    return data.type as MediaType
  }

  // Check for TV-specific properties
  if ('season' in data && 'episode' in data) {
    return 'tv'
  }

  if ('seasonNumber' in data || 'episodeNumber' in data || 'seriesTitle' in data) {
    return 'tv'
  }

  // Check for music-specific properties
  if ('artist' in data || 'album' in data || 'albumArt' in data) {
    return 'music'
  }

  // Check for movie-specific properties
  if ('releaseYear' in data || 'genres' in data) {
    return 'movie'
  }

  // Check for common movie API properties
  if ('runtime' in data && 'overview' in data && 'release_date' in data) {
    return 'movie'
  }

  // Check metadata for MIME type
  if (data.metadata?.mimeType) {
    return detectMediaTypeFromMimeType(data.metadata.mimeType)
  }

  return null
}

/**
 * Comprehensive media type detection
 * Tries multiple detection methods and returns the most confident result
 */
export function detectMediaType(
  data?: any,
  mimeType?: string,
  filename?: string,
  url?: string
): MediaType | null {
  const detectionResults: (MediaType | null)[] = []

  // Try data structure detection first (most reliable)
  if (data) {
    detectionResults.push(detectMediaTypeFromData(data))
  }

  // Try MIME type detection
  if (mimeType) {
    detectionResults.push(detectMediaTypeFromMimeType(mimeType))
  }

  // Try URL detection
  if (url) {
    detectionResults.push(detectMediaTypeFromUrl(url))
  }

  // Try filename extension detection
  if (filename) {
    detectionResults.push(detectMediaTypeFromExtension(filename))
  }

  // Return the first non-null result
  return detectionResults.find((result) => result !== null) || null
}

/**
 * Validates if a detected media type is supported
 * Used to check if the application can handle the detected media type
 */
export function isSupportedMediaType(mediaType: string): mediaType is MediaType {
  return ['movie', 'tv', 'music'].includes(mediaType)
}

/**
 * Gets the primary media category for a media type
 * Used for grouping and categorization
 */
export function getMediaCategory(mediaType: MediaType): 'video' | 'audio' {
  switch (mediaType) {
    case 'movie':
    case 'tv':
      return 'video'
    case 'music':
      return 'audio'
    default:
      throw new Error(`Unknown media type: ${mediaType}`)
  }
}

/**
 * Note: Type guard functions (isMovieMediaItem, isTVMediaItem, isMusicMediaItem)
 * are available from '../types/utility-types' to avoid conflicts
 */
