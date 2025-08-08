/**
 * Media player types index
 * Exports all media player type definitions
 */

// Core media player types
export type {
  BaseMediaItem,
  MediaItem,
  MediaType,
  MovieMediaItem,
  MusicMediaItem,
  PlayerConfig,
  PlayerState,
  TVMediaItem,
} from './media-player-types'

// Streaming types
export type {
  MediaSource,
  StreamUrlResponse,
  StreamingConfig,
  StreamingSession,
  UrlRefreshStatus,
} from './streaming-types'

// Error types
export type {
  AuthenticationError,
  ErrorCategory,
  ErrorRecoveryStrategy,
  ErrorSeverity,
  ErrorState,
  MediaFormatError,
  MediaPlayerError,
  MediaPlayerErrorType,
  NetworkError,
  PermissionError,
  PlayerLibraryError,
  SignedUrlError,
} from './error-types'

// Event types
export type {
  ErrorEvent,
  LoadingEvent,
  PlayEvent,
  PlayerEventEmitter,
  PlayerEventListener,
  PlayerEvents,
  TimeUpdateEvent,
  VolumeChangeEvent,
} from './player-events'
// Utility types and type guards
export {
  isMovieMediaItem,
  isMusicMediaItem,
  isTVMediaItem,
  isValidMediaType,
} from './utility-types'

export type {
  CreateMediaItemParams,
  OptionalMediaFields,
  PartialPlayerState,
  RequiredMediaFields,
} from './utility-types'
