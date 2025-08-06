import { AlertCircle, RotateCcw } from 'lucide-react'
import { memo, useCallback } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { apiQuery } from '@/lib/api-client'
import { MovieHero } from './movie-hero'

interface MovieDetailsProps {
  id: string
}

export const MovieDetails = memo(function MovieDetails({ id }: MovieDetailsProps) {
  // Fetch movie info
  const {
    data: movieInfo,
    isLoading: movieInfoLoading,
    error: movieInfoError,
    refetch: refetchMovieInfo,
  } = apiQuery.useQuery('get', '/movies/{id}/info', {
    params: {
      path: { id },
    },
    queryKey: ['movies', 'info', id],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnWindowFocus: false,
  })

  // Fetch movie images
  const {
    data: movieImages,
    isLoading: movieImagesLoading,
    error: movieImagesError,
    refetch: refetchMovieImages,
  } = apiQuery.useQuery('get', '/movies/{id}/images', {
    params: {
      path: { id },
    },
    queryKey: ['movies', 'images', id],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnWindowFocus: false,
  })

  // Memoized retry handlers
  const handleRetryMovieInfo = useCallback(() => {
    refetchMovieInfo()
  }, [refetchMovieInfo])

  const handleRetryMovieImages = useCallback(() => {
    refetchMovieImages()
  }, [refetchMovieImages])

  const handleRetryAll = useCallback(() => {
    refetchMovieInfo()
    refetchMovieImages()
  }, [refetchMovieInfo, refetchMovieImages])

  // Loading state - show skeleton while either API call is loading
  if (movieInfoLoading || movieImagesLoading) {
    return (
      <div className="space-y-8">
        <MovieHero isLoading={true} />
        <MovieDetailsSkeleton />
      </div>
    )
  }

  // Error state - both API calls failed
  if (movieInfoError && movieImagesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to load movie details</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          We couldn't load the movie information and images. Please check your connection and try again.
        </p>
        <Button onClick={handleRetryAll} className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    )
  }

  // Partial error state - only movie info failed
  if (movieInfoError && !movieImagesError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="w-16 h-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Movie not found</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          The movie you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={handleRetryMovieInfo} variant="outline" className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Try again
        </Button>
      </div>
    )
  }

  // Success state - at least movie info loaded
  return (
    <div className="space-y-8">
      {/* Movie Hero Section */}
      <MovieHero 
        movieInfo={movieInfo} 
        movieImages={movieImages} 
        isLoading={false}
      />

      {/* Movie Overview */}
      {movieInfo?.overview && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Overview</h2>
          <p className="text-base leading-relaxed text-muted-foreground">{movieInfo.overview}</p>
        </div>
      )}

      {/* Movie metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {movieInfo?.year && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Year</h3>
            <p className="text-lg">{movieInfo.year}</p>
          </div>
        )}
        {movieInfo?.runtime && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Runtime</h3>
            <p className="text-lg">{movieInfo.runtime} minutes</p>
          </div>
        )}
        {movieInfo?.rating && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Rating</h3>
            <p className="text-lg">{movieInfo.rating.toFixed(1)}/10</p>
          </div>
        )}
        {movieInfo?.certification && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Certification</h3>
            <p className="text-lg">{movieInfo.certification}</p>
          </div>
        )}
        {movieInfo?.status && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Status</h3>
            <p className="text-lg capitalize">{movieInfo.status}</p>
          </div>
        )}
        {movieInfo?.country && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Country</h3>
            <p className="text-lg">{movieInfo.country}</p>
          </div>
        )}
      </div>

      {/* Genres */}
      {movieInfo?.genres && movieInfo.genres.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">Genres</h3>
          <div className="flex flex-wrap gap-2">
            {movieInfo.genres.map((genre) => (
              <span
                key={genre}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Images error state */}
      {movieImagesError && (
        <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Failed to load movie images
            </span>
          </div>
          <Button
            onClick={handleRetryMovieImages}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Debug info - can be removed in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-semibold mb-2">Debug Info</h4>
          <p className="text-sm text-muted-foreground">Movie ID: {id}</p>
          <p className="text-sm text-muted-foreground">
            Images loaded: {movieImages ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-muted-foreground">
            Movie info loaded: {movieInfo ? 'Yes' : 'No'}
          </p>
        </div>
      )}
    </div>
  )
})

// Skeleton component for loading state
function MovieDetailsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Title and tagline skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-9 w-3/4 max-w-md" />
        <Skeleton className="h-6 w-1/2 max-w-sm" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Metadata skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>

      {/* Genres skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}