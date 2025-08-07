import type { MediaItem } from '@/stores/media-player-store'

interface MovieData {
  id?: string
  title: string
  poster_path?: string
  release_date?: string
  genres?: Array<{ name: string }>
  overview?: string
  runtime?: number
}

interface TVEpisodeData {
  id?: string
  name: string
  still_path?: string
  air_date?: string
  overview?: string
  runtime?: number
  season_number?: number
  episode_number?: number
}

interface TVShowData {
  id?: string
  name: string
  poster_path?: string
  first_air_date?: string
  genres?: Array<{ name: string }>
}

export function createMovieMediaItem(movieId: string, movieData: MovieData): MediaItem {
  return {
    id: `movie-${movieId}`,
    title: movieData.title,
    src: `/api/movies/${movieId}/stream`,
    type: 'video',
    poster: movieData.poster_path
      ? `https://image.tmdb.org/t/p/original${movieData.poster_path}`
      : undefined,
    movieId,
    year: movieData.release_date ? new Date(movieData.release_date).getFullYear() : undefined,
    genre: movieData.genres?.map((g) => g.name),
    description: movieData.overview,
    duration: movieData.runtime ? movieData.runtime * 60 : undefined, // Convert minutes to seconds
  }
}

export function createTVEpisodeMediaItem(
  tvId: string,
  seasonNumber: number,
  episodeNumber: number,
  episodeData: TVEpisodeData,
  showData?: TVShowData
): MediaItem {
  const title = showData
    ? `${showData.name} - S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')} - ${episodeData.name}`
    : `S${seasonNumber.toString().padStart(2, '0')}E${episodeNumber.toString().padStart(2, '0')} - ${episodeData.name}`

  return {
    id: `tv-${tvId}-s${seasonNumber}-e${episodeNumber}`,
    title,
    src: `/api/tvs/${tvId}/seasons/${seasonNumber}/episodes/${episodeNumber}/stream`,
    type: 'video',
    poster: episodeData.still_path
      ? `https://image.tmdb.org/t/p/original${episodeData.still_path}`
      : showData?.poster_path
        ? `https://image.tmdb.org/t/p/original${showData.poster_path}`
        : undefined,
    tvId,
    seasonNumber,
    episodeNumber,
    year: episodeData.air_date ? new Date(episodeData.air_date).getFullYear() : undefined,
    genre: showData?.genres?.map((g) => g.name),
    description: episodeData.overview,
    duration: episodeData.runtime ? episodeData.runtime * 60 : undefined,
  }
}

export function createAudioMediaItem(
  id: string,
  title: string,
  src: string,
  options: {
    artist?: string
    album?: string
    artwork?: string
    duration?: number
    year?: number
    genre?: string[]
  } = {}
): MediaItem {
  return {
    id: `audio-${id}`,
    title,
    src,
    type: 'audio',
    artist: options.artist,
    album: options.album,
    poster: options.artwork,
    duration: options.duration,
    year: options.year,
    genre: options.genre,
  }
}

// Helper to format media duration
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Helper to get media type icon
export function getMediaTypeIcon(type: 'video' | 'audio'): string {
  return type === 'video' ? '🎬' : '🎵'
}

// Helper to create playlist from multiple items
export function createPlaylist(items: MediaItem[]): MediaItem[] {
  return items.map((item, index) => ({
    ...item,
    id: `${item.id}-playlist-${index}`,
  }))
}
