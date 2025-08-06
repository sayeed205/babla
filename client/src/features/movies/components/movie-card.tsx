import { Badge } from '@/components/ui/badge.tsx'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiQuery } from '@/lib/api-client.ts'
import { AlertCircle, ImageIcon, RotateCcw, Star } from 'lucide-react'
import { useState } from 'react'

interface MovieCardProps {
  id: string
  priority?: boolean // for above-fold images
}

export function MovieCard({ id, priority = false }: MovieCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const {
    data: imageData,
    isLoading: imageDataLoading,
    error: imageDataError,
    refetch: refetchImages,
  } = apiQuery.useQuery('get', '/movies/{id}/images', {
    params: {
      path: { id },
    },
    queryKey:[`movie-image-${id}`],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - images don't change often
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache for 7 days
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex:number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  },)

  const { 
    data: movieData, 
    isLoading: movieDataLoading,
    error: movieDataError,
    refetch: refetchMovieInfo,
  } = apiQuery.useQuery('get', '/movies/{id}/info', {
    params: {
      path: { id },
    },
    queryKey:[`movie-info-${id}`],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - movie info doesn't change often
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache for 7 days
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex:number) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  })

  // Handle image load error
  const handleImageError = () => {
    setImageLoadError(true)
    setImageLoading(false)
  }

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoadError(false)
    setImageLoading(false)
  }

  // Retry loading images
  const handleRetryImages = () => {
    setImageLoadError(false)
    setImageLoading(true)
    refetchImages()
  }

  // Retry loading movie info
  const handleRetryMovieInfo = () => {
    refetchMovieInfo()
  }

  // Get the best available poster image
  const getPosterUrl = () => {
    if (!imageData?.movieposter?.length) return null
    
    // Sort by likes (popularity) and return the most liked poster
    const sortedPosters = [...imageData.movieposter].sort((a, b) => 
      parseInt(b.likes || '0') - parseInt(a.likes || '0')
    )
    
    return sortedPosters[0]?.url
  }

  // Generate fallback placeholder with movie title
  const getFallbackImage = () => {
    const title = imageData?.name || movieData?.title || 'Movie'
    const year = movieData?.year || ''
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="600" fill="#1f2937"/>
        <g fill="#9ca3af" text-anchor="middle" font-family="system-ui, sans-serif">
          <circle cx="200" cy="250" r="40" fill="#374151"/>
          <path d="M180 235h40v30h-40z" fill="#1f2937"/>
          <text x="200" y="350" font-size="18" font-weight="bold">${title}</text>
          ${year ? `<text x="200" y="380" font-size="14">${year}</text>` : ''}
        </g>
      </svg>
    `)}`
  }

  // Show loading skeleton while data is loading
  if (imageDataLoading || movieDataLoading) {
    return (
      <Card className="group relative overflow-hidden border-0 bg-card shadow-lg">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
          <Skeleton className="w-full h-full" />
        </div>
        <div className="p-4">
          <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </Card>
    )
  }

  // Show error state with retry option
  if (imageDataError && movieDataError) {
    return (
      <Card className="group relative overflow-hidden border-0 bg-card shadow-lg">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted flex flex-col items-center justify-center p-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground text-center mb-3">
            Failed to load movie data
          </p>
          <button
            onClick={() => {
              refetchImages()
              refetchMovieInfo()
            }}
            className="flex items-center gap-2 px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Retry
          </button>
        </div>
      </Card>
    )
  }

  const posterUrl = getPosterUrl()
  const movieTitle = imageData?.name || movieData?.title || 'Unknown Movie'
  const movieYear = movieData?.year
  const movieRating = movieData?.rating
  const movieGenres = movieData?.genres?.slice(0, 2).join(', ') || ''

  return (
    <Card className="group relative overflow-hidden border-0 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
        {/* Main poster image */}
        {posterUrl && !imageLoadError ? (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <img
              src={posterUrl}
              alt={`${movieTitle} poster`}
              className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
              loading={priority ? 'eager' : 'lazy'}
              onLoad={handleImageLoad}
              onError={handleImageError}
              decoding="async"
            />
          </>
        ) : (
          /* Fallback image */
          <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4 relative">
            {imageLoadError && posterUrl ? (
              /* Show retry option for failed image loads */
              <>
                <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Image failed to load
                </p>
                <button
                  onClick={handleRetryImages}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Retry
                </button>
              </>
            ) : (
              /* Show fallback placeholder */
              <img
                src={getFallbackImage()}
                alt={`${movieTitle} placeholder`}
                className="w-full h-full object-cover"
                loading={priority ? 'eager' : 'lazy'}
              />
            )}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating badge */}
        {movieRating && (
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="bg-black/50 text-white border-0 backdrop-blur-sm">
              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
              {movieRating.toFixed(1)}
            </Badge>
          </div>
        )}

        {/* Loading indicator for movie info */}
        {movieDataLoading && (
          <div className="absolute top-3 left-3">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Movie title and details */}
      <div className="p-4 group-hover:bg-black/5 transition-colors duration-300">
        <h3 className="font-bold text-lg text-center text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-1">
          {movieTitle}
        </h3>
        <p className="text-sm text-muted-foreground text-center">
          {movieYear && movieGenres 
            ? `${movieYear} • ${movieGenres}`
            : movieYear || movieGenres || 'Movie'
          }
        </p>
        
        {/* Error indicator for movie info */}
        {movieDataError && (
          <div className="flex items-center justify-center mt-2">
            <button
              onClick={handleRetryMovieInfo}
              className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Retry loading movie info"
            >
              <AlertCircle className="w-3 h-3" />
              <span>Retry info</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
