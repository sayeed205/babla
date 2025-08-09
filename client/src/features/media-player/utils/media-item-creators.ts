/**
 * Media item creator utilities
 * Functions to create MediaItem objects from different data sources
 */

import type { components } from '@/lib/api/v1'
import type {
  MediaItem,
  MovieMediaItem,
  MusicMediaItem,
  TVMediaItem,
} from '../types/media-player-types'

// Type aliases for API data structures
type MovieInfo = components['schemas']['MovieInfo']

// Interface for movie data from the movies list endpoint
interface MovieListItem {
  id: string
  title: string
  year: number
  poster?: string
}

// Interface for TV show data (based on the TV model structure)
interface TVShowData {
  id: string
  title: string
  year: number
  trakt?: number
  tvdb?: number
  imdb?: string
  tmdb?: number
}

// Interface for episode data (based on the Episode model structure)
interface EpisodeData {
  id: string
  season: number
  number: number
  title: string
  trakt?: number
  tvdb?: number
  imdb?: string
  tmdb?: number
  metadata?: {
    mimeType: string
    size: number
    filename: string
  }
}

// Interface for music data (placeholder for future implementation)
interface MusicData {
  id: string
  title: string
  artist?: string
  album?: string
  duration?: number
  albumArt?: string
  metadata?: {
    mimeType: string
    size: number
    filename: string
  }
}

/**
 * Creates a MovieMediaItem from movie list data
 * Used when creating media items from the movies list endpoint
 */
export function createMovieMediaItem(movieData: MovieListItem): MovieMediaItem {
  return {
    id: movieData.id,
    type: 'movie',
    title: movieData.title,
    releaseYear: movieData.year,
    thumbnail: movieData.poster ? `https://image.tmdb.org/t/p/w500${movieData.poster}` : undefined,
    metadata: {
      source: 'movies-list',
      originalData: movieData,
    },
  }
}

/**
 * Creates a MovieMediaItem from detailed movie info
 * Used when creating media items from the movie details endpoint
 */
export function createMovieMediaItemFromDetails(movieInfo: MovieInfo): MovieMediaItem {
  return {
    id: movieInfo.id.toString(),
    type: 'movie',
    title: movieInfo.title,
    releaseYear: new Date(movieInfo.release_date).getFullYear(),
    duration: movieInfo.runtime ? movieInfo.runtime * 60 : undefined, // Convert minutes to seconds
    thumbnail: movieInfo.poster_path
      ? `https://image.tmdb.org/t/p/w500${movieInfo.poster_path}`
      : undefined,
    genres: movieInfo.genres?.map((genre) => genre.name) || [],
    metadata: {
      source: 'movie-details',
      tmdbId: movieInfo.id,
      imdbId: movieInfo.imdb_id,
      overview: movieInfo.overview,
      backdropPath: movieInfo.backdrop_path,
      voteAverage: movieInfo.vote_average,
      originalData: movieInfo,
    },
  }
}

/**
 * Creates a TVMediaItem from TV show data
 * Used when creating media items for TV shows
 */
export function createTVMediaItem(
  tvData: TVShowData,
  episodeData?: EpisodeData,
  seriesTitle?: string
): TVMediaItem {
  const baseItem: TVMediaItem = {
    id: episodeData ? `${tvData.id}-s${episodeData.season}e${episodeData.number}` : tvData.id,
    type: 'tv',
    title: episodeData ? episodeData.title : tvData.title,
    seriesTitle: seriesTitle || tvData.title,
    metadata: {
      source: 'tv-data',
      showId: tvData.id,
      originalData: { tvData, episodeData },
    },
  }

  // Add episode-specific data if available
  if (episodeData) {
    baseItem.seasonNumber = episodeData.season
    baseItem.episodeNumber = episodeData.number

    // Calculate duration from metadata if available
    if (episodeData.metadata?.size) {
      // Rough estimation: assume 1MB per minute for video content
      // This is a placeholder - actual duration should come from video metadata
      baseItem.duration = Math.round((episodeData.metadata.size / (1024 * 1024)) * 60)
    }
  }

  return baseItem
}

/**
 * Creates a TVMediaItem specifically for an episode
 * Used when creating media items for individual TV episodes
 */
export function createTVEpisodeMediaItem(
  tvData: TVShowData,
  episodeData: EpisodeData
): TVMediaItem {
  return createTVMediaItem(tvData, episodeData, tvData.title)
}

/**
 * Creates a MusicMediaItem from music data
 * Used when creating media items for music content (future implementation)
 */
export function createMusicMediaItem(musicData: MusicData): MusicMediaItem {
  return {
    id: musicData.id,
    type: 'music',
    title: musicData.title,
    artist: musicData.artist,
    album: musicData.album,
    duration: musicData.duration,
    albumArt: musicData.albumArt,
    metadata: {
      source: 'music-data',
      mimeType: musicData.metadata?.mimeType,
      size: musicData.metadata?.size,
      filename: musicData.metadata?.filename,
      originalData: musicData,
    },
  }
}

/**
 * Generic function to create a MediaItem from various data sources
 * Automatically detects the media type and creates the appropriate MediaItem
 */
export function createMediaItem(data: any, type?: 'movie' | 'tv' | 'music'): MediaItem {
  // If type is explicitly provided, use it
  if (type) {
    switch (type) {
      case 'movie':
        // Check if it's detailed movie info or list item
        if ('runtime' in data && 'overview' in data) {
          return createMovieMediaItemFromDetails(data as MovieInfo)
        }
        return createMovieMediaItem(data as MovieListItem)

      case 'tv':
        return createTVMediaItem(data.tvData || data, data.episodeData)

      case 'music':
        return createMusicMediaItem(data as MusicData)
    }
  }

  // Auto-detect type based on data structure
  if ('year' in data && 'poster' in data && !('season' in data)) {
    // Looks like movie data
    if ('runtime' in data && 'overview' in data) {
      return createMovieMediaItemFromDetails(data as MovieInfo)
    }
    return createMovieMediaItem(data as MovieListItem)
  }

  if ('season' in data && 'number' in data) {
    // Looks like episode data
    throw new Error('TV episode data requires both TV show and episode information')
  }

  if ('artist' in data || 'album' in data) {
    // Looks like music data
    return createMusicMediaItem(data as MusicData)
  }

  throw new Error('Unable to determine media type from provided data')
}

/**
 * Creates a MediaItem with minimal required data
 * Useful for creating placeholder items or items with limited information
 */
export function createMinimalMediaItem(
  id: string,
  title: string,
  type: 'movie' | 'tv' | 'music',
  additionalData?: Partial<MediaItem>
): MediaItem {
  const baseItem = {
    id,
    title,
    type,
    ...additionalData,
  }

  switch (type) {
    case 'movie':
      return baseItem as MovieMediaItem
    case 'tv':
      return baseItem as TVMediaItem
    case 'music':
      return baseItem as MusicMediaItem
    default:
      throw new Error(`Invalid media type: ${type}`)
  }
}
