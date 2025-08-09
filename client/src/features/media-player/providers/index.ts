/**
 * Media player providers index
 * Exports all provider components and hooks
 */

export {
  MediaPlayerProvider,
  useCurrentIndex,
  useCurrentMedia,
  useIsLoading,
  useIsPlaying,
  useMediaPlayer,
  useMediaPlayerOptional,
  usePlayerConfig,
  usePlayerError,
  // Re-export store selectors for convenience
  usePlayerState,
  useQueue,
} from './media-player-provider'

export type { MediaPlayerContextValue, MediaPlayerProviderProps } from './media-player-provider'
