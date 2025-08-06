import { type components } from '@/lib/api/v1.d'
import { memo } from 'react'

interface MovieHeroProps {
  movieInfo?: components['schemas']['MovieInfo']
  movieImages?: components['schemas']['MovieImages']
  isLoading?: boolean
}

export const MovieHero = memo(function MovieHero({
  movieInfo,
  movieImages,
  isLoading = false,
}: MovieHeroProps) {
  // Get the best background image (prefer moviebackground, fallback to movie4kbackground)
  const getBackgroundImage = () => {
    if (!movieImages) return null
    
    // Try moviebackground first
    if (movieImages.moviebackground && movieImages.moviebackground.length > 0) {
      // Sort by likes (descending) and take the first one
      const sortedBackgrounds = [...movieImages.moviebackground].sort(
        (a, b) => parseInt(b.likes) - parseInt(a.likes)
      )
      return sortedBackgrounds[0].url
    }
    
    // Fallback to movie4kbackground
    if (movieImages.movie4kbackground && movieImages.movie4kbackground.length > 0) {
      const sortedBackgrounds = [...movieImages.movie4kbackground].sort(
        (a, b) => parseInt(b.likes) - parseInt(a.likes)
      )
      return sortedBackgrounds[0].url
    }
    
    return null
  }

  // Get the movie logo (prefer hdmovielogo, fallback to movielogo)
  const getMovieLogo = () => {
    if (!movieImages) return null
    
    // Try hdmovielogo first
    if (movieImages.hdmovielogo && movieImages.hdmovielogo.length > 0) {
      const sortedLogos = [...movieImages.hdmovielogo].sort(
        (a, b) => parseInt(b.likes) - parseInt(a.likes)
      )
      return sortedLogos[0].url
    }
    
    // Fallback to movielogo
    if (movieImages.movielogo && movieImages.movielogo.length > 0) {
      const sortedLogos = [...movieImages.movielogo].sort(
        (a, b) => parseInt(b.likes) - parseInt(a.likes)
      )
      return sortedLogos[0].url
    }
    
    return null
  }

  const backgroundImage = getBackgroundImage()
  const movieLogo = getMovieLogo()

  if (isLoading) {
    return <MovieHeroSkeleton />
  }

  return (
    <div className="relative w-full h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden rounded-lg">
      {/* Background Image */}
      {backgroundImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        >
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        </div>
      ) : (
        // Fallback background when no image is available
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted/60" />
      )}

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 lg:p-12">
        <div className="max-w-4xl">
          {/* Movie Logo or Title */}
          {movieLogo ? (
            <div className="mb-4">
              <img
                src={movieLogo}
                alt={movieInfo?.title || 'Movie Logo'}
                className="max-h-24 md:max-h-32 lg:max-h-40 w-auto object-contain"
                onError={(e) => {
                  // Hide logo if it fails to load and show title instead
                  e.currentTarget.style.display = 'none'
                  const titleElement = e.currentTarget.parentElement?.nextElementSibling
                  if (titleElement) {
                    titleElement.classList.remove('hidden')
                  }
                }}
              />
              {/* Hidden title that shows if logo fails */}
              <h1 className="hidden text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg">
                {movieInfo?.title}
              </h1>
            </div>
          ) : (
            // Show title when no logo is available
            movieInfo?.title && (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg mb-4">
                {movieInfo.title}
              </h1>
            )
          )}

          {/* Tagline */}
          {movieInfo?.tagline && (
            <p className="text-lg md:text-xl lg:text-2xl text-white/90 font-medium italic drop-shadow-md max-w-2xl">
              {movieInfo.tagline}
            </p>
          )}

          {/* Basic movie info */}
          <div className="flex flex-wrap items-center gap-4 mt-6 text-white/80">
            {movieInfo?.year && (
              <span className="text-sm md:text-base font-medium">
                {movieInfo.year}
              </span>
            )}
            {movieInfo?.runtime && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-sm md:text-base font-medium">
                  {movieInfo.runtime} min
                </span>
              </>
            )}
            {movieInfo?.certification && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-sm md:text-base font-medium px-2 py-1 bg-white/20 rounded border border-white/30">
                  {movieInfo.certification}
                </span>
              </>
            )}
            {movieInfo?.rating && (
              <>
                <span className="text-white/40">•</span>
                <span className="text-sm md:text-base font-medium">
                  ⭐ {movieInfo.rating.toFixed(1)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

// Skeleton component for loading state
function MovieHeroSkeleton() {
  return (
    <div className="relative w-full h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden rounded-lg bg-muted animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted/60" />
      
      <div className="relative z-10 flex flex-col justify-end h-full p-6 md:p-8 lg:p-12">
        <div className="max-w-4xl space-y-4">
          {/* Title skeleton */}
          <div className="h-12 md:h-16 lg:h-20 w-3/4 max-w-md bg-white/20 rounded" />
          
          {/* Tagline skeleton */}
          <div className="h-6 md:h-8 w-1/2 max-w-sm bg-white/15 rounded" />
          
          {/* Info skeleton */}
          <div className="flex gap-4 mt-6">
            <div className="h-5 w-12 bg-white/15 rounded" />
            <div className="h-5 w-16 bg-white/15 rounded" />
            <div className="h-5 w-10 bg-white/15 rounded" />
            <div className="h-5 w-14 bg-white/15 rounded" />
          </div>
        </div>
      </div>
    </div>
  )
}