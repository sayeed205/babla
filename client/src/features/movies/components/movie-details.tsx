import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Play,
  Plus,
  RotateCcw,
  Share,
  Star,
} from 'lucide-react'
import { memo, useCallback, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { createMovieMediaItemFromDetails, useMediaPlayer } from '@/features/media-player'
import { apiQuery } from '@/lib/api-client'

interface MovieDetailsProps {
  id: string
}

export const MovieDetails = memo(function MovieDetails({ id }: MovieDetailsProps) {
  // Media player integration
  const mediaPlayer = useMediaPlayer()
  const [isPlaybackLoading, setIsPlaybackLoading] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  // Fetch movie info using the correct endpoint
  const {
    data: movieData,
    isLoading,
    error,
    refetch,
  } = apiQuery.useQuery('get', '/movies/{id}', {
    params: {
      path: { id },
    },
    queryKey: ['movies', 'details', id],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnWindowFocus: false,
  })

  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  // Handle movie playback
  const handlePlayMovie = useCallback(async () => {
    if (!movieData) return

    try {
      setIsPlaybackLoading(true)
      setPlaybackError(null)

      console.log('Starting movie playback for:', id)
      console.log('Movie data:', movieData)

      // Create media item from movie data, using the route ID instead of TMDB ID
      const movieMediaItem = createMovieMediaItemFromDetails(movieData)
      // Override the ID with the correct database ID from the route
      movieMediaItem.id = id

      console.log('Created media item:', movieMediaItem)

      // Start playback using media player
      mediaPlayer.playMedia(movieMediaItem)
      console.log('Called playMedia')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start playback'
      setPlaybackError(errorMessage)
      console.error('Movie playback error:', error)
    } finally {
      setIsPlaybackLoading(false)
    }
  }, [movieData, mediaPlayer, id])

  // Clear playback error when movie data changes
  useCallback(() => {
    if (playbackError) {
      setPlaybackError(null)
    }
  }, [movieData, playbackError])

  // Loading state
  if (isLoading) {
    return <MovieDetailsSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load movie details</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {error.message?.includes('404') || error.message?.includes('not found')
            ? "The movie you're looking for doesn't exist or has been removed."
            : "We couldn't load the movie information. Please check your connection and try again."}
        </p>
        <Button onClick={handleRetry} className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    )
  }

  if (!movieData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <h2 className="text-xl font-semibold mb-2">Movie not found</h2>
        <p className="text-muted-foreground text-center">
          The movie you're looking for doesn't exist.
        </p>
      </div>
    )
  }

  // Extract year from release_date
  const releaseYear = movieData.release_date ? new Date(movieData.release_date).getFullYear() : null

  // Get backdrop image URL
  const backdropUrl = movieData.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movieData.backdrop_path}`
    : null

  // Get poster image URL
  const posterUrl = movieData.poster_path
    ? `https://image.tmdb.org/t/p/original${movieData.poster_path}`
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative w-full h-screen overflow-hidden">
        {/* Background Image */}
        {backdropUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
            style={{ backgroundImage: `url(${backdropUrl})` }}
          >
            {/* Enhanced gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900" />
        )}

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-center h-full px-6 md:px-12 lg:px-16">
          <div className="mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left side - Movie Info */}
              <div className="lg:col-span-8 space-y-6">
                {/* Movie Title */}
                <div className="space-y-4">
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white drop-shadow-2xl leading-tight">
                    {movieData.title}
                  </h1>

                  {/* Tagline */}
                  {movieData.tagline && (
                    <p className="text-xl md:text-2xl text-white/90 font-light italic drop-shadow-lg max-w-3xl">
                      "{movieData.tagline}"
                    </p>
                  )}
                </div>

                {/* Movie Meta Info */}
                <div className="flex flex-wrap items-center gap-6 text-white/90">
                  {releaseYear && (
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">{releaseYear}</span>
                    </div>
                  )}
                  {movieData.runtime && (
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{movieData.runtime} min</span>
                    </div>
                  )}
                  {movieData.vote_average && (
                    <div className="flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-yellow-100">
                        {movieData.vote_average.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Genres */}
                {movieData.genres && movieData.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {movieData.genres.slice(0, 4).map((genre) => (
                      <Badge
                        key={genre.id}
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-colors"
                      >
                        {genre.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Overview */}
                {movieData.overview && (
                  <p className="text-lg text-white/80 leading-relaxed max-w-3xl line-clamp-4">
                    {movieData.overview}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 pt-4">
                  <Button
                    size="lg"
                    className="bg-white text-black hover:bg-white/90 font-semibold px-8 py-3 rounded-full transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    onClick={handlePlayMovie}
                    disabled={isPlaybackLoading || !movieData}
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" />
                    {isPlaybackLoading ? 'Loading...' : 'Play'}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-full backdrop-blur-sm"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    My List
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-full backdrop-blur-sm"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Like
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-full backdrop-blur-sm"
                  >
                    <Share className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                </div>

                {/* Playback Error Display */}
                {playbackError && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-red-100 font-medium">Playback Error</p>
                      <p className="text-red-200/80 text-sm">{playbackError}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-400/30 text-red-100 hover:bg-red-500/20"
                      onClick={() => setPlaybackError(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>

              {/* Right side - Poster */}
              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                {posterUrl && (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-t from-purple-500/20 to-blue-500/20 rounded-2xl blur-xl transform scale-110 opacity-60"></div>
                    <img
                      src={posterUrl}
                      alt={`${movieData.title} poster`}
                      className="relative w-80 h-auto object-cover rounded-2xl shadow-2xl transform transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="px-6 md:px-12 lg:px-16 pb-16 space-y-16">
        <div className="mx-auto">
          {/* Cast Section */}
          {movieData.credits?.cast && movieData.credits.cast.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white">Cast</h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10 rounded-full p-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10 rounded-full p-2"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {movieData.credits.cast.slice(0, 12).map((person) => (
                  <div key={person.id} className="flex-shrink-0 w-32 group cursor-pointer">
                    <div className="relative mb-3">
                      <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-700 ring-2 ring-white/10 group-hover:ring-white/30 transition-all duration-300">
                        {person.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/original${person.profile_path}`}
                            alt={person.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                            <span className="text-white/40 text-2xl font-bold">
                              {person.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-white font-medium text-sm leading-tight line-clamp-2">
                        {person.name}
                      </p>
                      <p className="text-white/60 text-xs leading-tight line-clamp-2">
                        {person.character}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Crew Section */}
          {movieData.credits?.crew && movieData.credits.crew.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold text-white">Crew</h2>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10 rounded-full p-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10 rounded-full p-2"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {movieData.credits.crew
                  .filter(
                    (person, index, self) => index === self.findIndex((p) => p.id === person.id)
                  )
                  .slice(0, 12)
                  .map((person) => (
                    <div
                      key={`${person.id}-${person.job}`}
                      className="flex-shrink-0 w-32 group cursor-pointer"
                    >
                      <div className="relative mb-3">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-700 ring-2 ring-white/10 group-hover:ring-white/30 transition-all duration-300">
                          {person.profile_path ? (
                            <img
                              src={`https://image.tmdb.org/t/p/original${person.profile_path}`}
                              alt={person.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                              <span className="text-white/40 text-2xl font-bold">
                                {person.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-white font-medium text-sm leading-tight line-clamp-2">
                          {person.name}
                        </p>
                        <p className="text-white/60 text-xs leading-tight line-clamp-2">
                          {person.job}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Movie Details Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Production Details */}
            <div className="space-y-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white">Production Details</h3>
              <div className="space-y-4">
                {movieData.status && (
                  <div>
                    <span className="text-sm font-medium text-white/60">Status</span>
                    <p className="text-white font-medium">{movieData.status}</p>
                  </div>
                )}
                {movieData.budget && movieData.budget > 0 && (
                  <div>
                    <span className="text-sm font-medium text-white/60">Budget</span>
                    <p className="text-white font-medium">${movieData.budget.toLocaleString()}</p>
                  </div>
                )}
                {movieData.revenue && movieData.revenue > 0 && (
                  <div>
                    <span className="text-sm font-medium text-white/60">Revenue</span>
                    <p className="text-white font-medium">${movieData.revenue.toLocaleString()}</p>
                  </div>
                )}
                {movieData.original_language && (
                  <div>
                    <span className="text-sm font-medium text-white/60">Original Language</span>
                    <p className="text-white font-medium uppercase">
                      {movieData.original_language}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Production Companies */}
            {movieData.production_companies && movieData.production_companies.length > 0 && (
              <div className="space-y-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white">Production Companies</h3>
                <div className="space-y-4">
                  {movieData.production_companies.slice(0, 4).map((company) => (
                    <div key={company.id} className="flex items-center gap-3">
                      {company.logo_path && (
                        <div className="w-10 h-10 bg-white rounded-lg p-1 flex-shrink-0">
                          <img
                            src={`https://image.tmdb.org/t/p/original${company.logo_path}`}
                            alt={company.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <span className="text-white text-sm font-medium">{company.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {movieData.spoken_languages && movieData.spoken_languages.length > 0 && (
              <div className="space-y-6 bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {movieData.spoken_languages.map((language) => (
                    <Badge
                      key={language.iso_639_1}
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white"
                    >
                      {language.english_name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* More Like This Section */}
          <section className="space-y-6">
            <h2 className="text-3xl font-bold text-white">More Like This</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Placeholder for similar movies */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="aspect-[2/3] bg-slate-700 rounded-lg overflow-hidden group-hover:scale-105 transition-transform duration-300">
                    <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                      <span className="text-white/40 text-sm">Similar Movie {i + 1}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
})

// Skeleton component for loading state
function MovieDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Skeleton */}
      <div className="relative w-full h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 animate-pulse" />

        <div className="relative z-10 flex flex-col justify-center h-full px-6 md:px-12 lg:px-16">
          <div className="mx-auto w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-6">
                <div className="space-y-4">
                  <Skeleton className="h-16 md:h-20 lg:h-24 w-3/4 bg-white/10" />
                  <Skeleton className="h-6 md:h-8 w-1/2 bg-white/10" />
                </div>

                <div className="flex gap-4">
                  <Skeleton className="h-8 w-20 rounded-full bg-white/10" />
                  <Skeleton className="h-8 w-24 rounded-full bg-white/10" />
                  <Skeleton className="h-8 w-16 rounded-full bg-white/10" />
                </div>

                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-16 rounded-full bg-white/10" />
                  ))}
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-4 w-full bg-white/10" />
                  <Skeleton className="h-4 w-full bg-white/10" />
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                </div>

                <div className="flex gap-4 pt-4">
                  <Skeleton className="h-12 w-24 rounded-full bg-white/10" />
                  <Skeleton className="h-12 w-28 rounded-full bg-white/10" />
                  <Skeleton className="h-12 w-20 rounded-full bg-white/10" />
                </div>
              </div>

              <div className="lg:col-span-4 flex justify-center lg:justify-end">
                <Skeleton className="w-80 h-[480px] rounded-2xl bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="px-6 md:px-12 lg:px-16 pb-16 space-y-16">
        <div className="mx-auto space-y-16">
          {/* Cast Skeleton */}
          <div className="space-y-6">
            <Skeleton className="h-8 w-32 bg-white/10" />
            <div className="flex gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-32 space-y-3">
                  <Skeleton className="w-32 h-32 rounded-full bg-white/10" />
                  <Skeleton className="h-4 w-24 bg-white/10" />
                  <Skeleton className="h-3 w-20 bg-white/10" />
                </div>
              ))}
            </div>
          </div>

          {/* Details Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4 bg-white/5 rounded-2xl p-6">
                <Skeleton className="h-6 w-32 bg-white/10" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="space-y-1">
                      <Skeleton className="h-3 w-16 bg-white/10" />
                      <Skeleton className="h-4 w-24 bg-white/10" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
