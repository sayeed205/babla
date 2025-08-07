/**
 * Utility functions for extracting movie IDs from various URL formats
 * Requirements: 1.1, 5.2
 */

/**
 * Result of movie ID extraction with validation information
 */
export interface MovieIdExtractionResult {
  /** The extracted movie ID, or null if extraction failed */
  movieId: string | null
  /** Whether the extraction was successful */
  isValid: boolean
  /** The type of content detected from the URL */
  contentType: 'movie' | 'tv' | 'unknown'
  /** Additional metadata extracted from the URL */
  metadata?: {
    tvId?: string
    seasonNumber?: number
    episodeNumber?: number
  }
  /** Error message if extraction failed */
  error?: string
}

/**
 * Extract movie ID from various URL formats used in the application
 *
 * Supported URL patterns:
 * - `/api/movies/{movieId}/stream`
 * - `/api/movies/{movieId}/stream?expires=...&signature=...`
 * - `https://domain.com/api/movies/{movieId}/stream`
 * - `/movies/{movieId}/stream`
 * - `movies/{movieId}/stream`
 *
 * @param src - The source URL to extract movie ID from
 * @returns MovieIdExtractionResult with extraction details
 */
export function extractMovieId(src: string): MovieIdExtractionResult {
  // Input validation
  if (!src || typeof src !== 'string') {
    return {
      movieId: null,
      isValid: false,
      contentType: 'unknown',
      error: 'Invalid or empty source URL provided',
    }
  }

  // Clean and normalize the URL
  const cleanUrl = src.trim()

  if (cleanUrl.length === 0) {
    return {
      movieId: null,
      isValid: false,
      contentType: 'unknown',
      error: 'Empty source URL provided',
    }
  }

  try {
    // Remove query parameters and fragments for pattern matching
    const urlWithoutQuery = cleanUrl.split('?')[0].split('#')[0]

    // Remove protocol and domain if present to focus on path
    const pathOnly = urlWithoutQuery.replace(/^https?:\/\/[^\/]+/, '')

    // Normalize path by removing leading/trailing slashes
    const normalizedPath = pathOnly.replace(/^\/+|\/+$/g, '')

    // Pattern 1: Movie URLs - /api/movies/{movieId}/stream
    const moviePattern = /^(?:api\/)?movies\/([^\/\s]+)\/stream$/i
    const movieMatch = normalizedPath.match(moviePattern)

    if (movieMatch) {
      const movieId = movieMatch[1]

      // Validate movie ID format
      if (!isValidMovieId(movieId)) {
        return {
          movieId: null,
          isValid: false,
          contentType: 'movie',
          error: `Invalid movie ID format: ${movieId}`,
        }
      }

      return {
        movieId,
        isValid: true,
        contentType: 'movie',
      }
    }

    // Pattern 2: TV Episode URLs - /api/tvs/{tvId}/seasons/{seasonNumber}/episodes/{episodeNumber}/stream
    const tvPattern = /^(?:api\/)?tvs\/([^\/\s]+)\/seasons\/(\d+)\/episodes\/(\d+)\/stream$/i
    const tvMatch = normalizedPath.match(tvPattern)

    if (tvMatch) {
      const tvId = tvMatch[1]
      const seasonNumber = parseInt(tvMatch[2], 10)
      const episodeNumber = parseInt(tvMatch[3], 10)

      // Validate TV ID format
      if (!isValidMovieId(tvId)) {
        return {
          movieId: null,
          isValid: false,
          contentType: 'tv',
          error: `Invalid TV show ID format: ${tvId}`,
          metadata: { tvId, seasonNumber, episodeNumber },
        }
      }

      // For TV content, we return the TV ID as the "movieId" for consistency
      // The calling code can check contentType to handle TV vs Movie differently
      return {
        movieId: tvId,
        isValid: true,
        contentType: 'tv',
        metadata: { tvId, seasonNumber, episodeNumber },
      }
    }

    // Pattern 3: Legacy or alternative movie patterns
    const legacyMoviePattern = /^(?:api\/)?movies\/([^\/\s]+)(?:\/.*)?$/i
    const legacyMatch = normalizedPath.match(legacyMoviePattern)

    if (legacyMatch) {
      const movieId = legacyMatch[1]

      // Skip if it's actually a TV pattern that we missed
      if (normalizedPath.includes('/seasons/') || normalizedPath.includes('/episodes/')) {
        return {
          movieId: null,
          isValid: false,
          contentType: 'unknown',
          error: 'URL appears to be TV content but does not match expected TV pattern',
        }
      }

      if (!isValidMovieId(movieId)) {
        return {
          movieId: null,
          isValid: false,
          contentType: 'movie',
          error: `Invalid movie ID format: ${movieId}`,
        }
      }

      return {
        movieId,
        isValid: true,
        contentType: 'movie',
      }
    }

    // No patterns matched
    return {
      movieId: null,
      isValid: false,
      contentType: 'unknown',
      error: `URL does not match any supported pattern: ${cleanUrl}`,
    }
  } catch (error) {
    return {
      movieId: null,
      isValid: false,
      contentType: 'unknown',
      error: `Error parsing URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Validate movie ID format
 * Movie IDs should be non-empty strings that don't contain invalid characters
 *
 * @param movieId - The movie ID to validate
 * @returns true if the movie ID is valid
 */
function isValidMovieId(movieId: string): boolean {
  if (!movieId || typeof movieId !== 'string') {
    return false
  }

  // Trim whitespace
  const trimmed = movieId.trim()

  // Check for empty string
  if (trimmed.length === 0) {
    return false
  }

  // Check for reasonable length (between 1 and 200 characters)
  if (trimmed.length > 200) {
    return false
  }

  // Check for invalid characters that shouldn't be in URLs
  // Allow alphanumeric, hyphens, underscores, and dots
  const validPattern = /^[a-zA-Z0-9\-_.]+$/
  if (!validPattern.test(trimmed)) {
    return false
  }

  // Additional checks for common invalid patterns
  if (trimmed === '.' || trimmed === '..' || trimmed.startsWith('.') || trimmed.endsWith('.')) {
    return false
  }

  return true
}

/**
 * Extract movie ID from a source URL, returning only the ID string or null
 * This is a convenience function for cases where you only need the ID
 *
 * @param src - The source URL to extract movie ID from
 * @returns The movie ID string or null if extraction failed
 */
export function getMovieIdFromUrl(src: string): string | null {
  const result = extractMovieId(src)
  return result.isValid ? result.movieId : null
}

/**
 * Check if a URL is a movie streaming URL (not TV content)
 *
 * @param src - The source URL to check
 * @returns true if the URL is for movie content
 */
export function isMovieUrl(src: string): boolean {
  const result = extractMovieId(src)
  return result.isValid && result.contentType === 'movie'
}

/**
 * Check if a URL is a TV episode streaming URL
 *
 * @param src - The source URL to check
 * @returns true if the URL is for TV episode content
 */
export function isTvUrl(src: string): boolean {
  const result = extractMovieId(src)
  return result.isValid && result.contentType === 'tv'
}

/**
 * Get content type from a streaming URL
 *
 * @param src - The source URL to analyze
 * @returns The content type detected from the URL
 */
export function getContentType(src: string): 'movie' | 'tv' | 'unknown' {
  const result = extractMovieId(src)
  return result.contentType
}
