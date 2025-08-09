/**
 * Media player feature index
 * Exports all media player functionality
 */

// Types
export * from './types'

// Stores
export * from './stores'

// Services
export * from './services'

// Hooks
export * from './hooks'

// Providers
export * from './providers'

// Utilities - explicitly export to avoid conflicts
export {
  createMediaItem,
  createMinimalMediaItem,
  createMovieMediaItem,
  createMovieMediaItemFromDetails,
  createMusicMediaItem,
  createTVEpisodeMediaItem,
  createTVMediaItem,
} from './utils/media-item-creators'

export {
  detectMediaType,
  detectMediaTypeFromData,
  detectMediaTypeFromExtension,
  detectMediaTypeFromMimeType,
  detectMediaTypeFromUrl,
  getMediaCategory,
  isSupportedMediaType,
} from './utils/media-type-detection'

export {
  MediaValidationError,
  isPlayableMediaItem,
  sanitizeMediaItem,
  validateBaseMediaItem,
  validateImageUrl,
  validateMediaItem,
  validateMediaItems,
  validateMediaType,
  validateMovieMediaItem,
  validateMusicMediaItem,
  validateTVMediaItem,
  validateUrl,
} from './utils/media-validation'
