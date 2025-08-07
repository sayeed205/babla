import { Card } from '@/components/ui/card'
import { ImageIcon } from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'

interface Movie {
  id: string
  title: string
  year: number
  poster?: string
}

interface MovieCardProps {
  movie: Movie
  priority?: boolean // for above-fold images
}

export const MovieCard = memo(function MovieCard({ movie, priority = false }: MovieCardProps) {
  const [imageLoadError, setImageLoadError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  // Memoized handlers for better performance
  const handleImageError = useCallback(() => {
    setImageLoadError(true)
    setImageLoading(false)
  }, [])

  const handleImageLoad = useCallback(() => {
    setImageLoadError(false)
    setImageLoading(false)
  }, [])

  // Memoized poster URL - use TMDB base URL for posters
  const posterUrl = useMemo(() => {
    if (!movie.poster) return null
    return `https://image.tmdb.org/t/p/original${movie.poster}`
  }, [movie.poster])


  // Memoized fallback image generation
  const fallbackImage = useMemo(() => {
    const title = movie.title || 'Movie'
    const year = movie.year || ''
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
  }, [movie.title, movie.year])

  return (
    <Card className="group relative overflow-hidden border-0 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
        {/* Main poster image */}
        {posterUrl && !imageLoadError ? (
          <img
            src={posterUrl}
            alt={`${movie.title} poster`}
            className={`w-full h-full object-cover transition-all duration-300 group-hover:scale-110 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, 25vw"
            loading={priority ? 'eager' : 'lazy'}
            onLoad={handleImageLoad}
            onError={handleImageError}
            decoding="async"
            fetchPriority={priority ? 'high' : 'auto'}
            referrerPolicy="no-referrer"
          />
        ) : (
          /* Fallback image */
          <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4 relative">
            {imageLoadError && posterUrl ? (
              /* Show message for failed image loads */
              <>
                <ImageIcon className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground text-center">Image not available</p>
              </>
            ) : (
              /* Show fallback placeholder */
              <img
                src={fallbackImage}
                alt={`${movie.title} placeholder`}
                className="w-full h-full object-cover"
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
              />
            )}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Movie title and details */}
      <div className="p-4 group-hover:bg-black/5 transition-colors duration-300">
        <h3 className="font-bold text-lg text-center text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 mb-1">
          {movie.title}
        </h3>
        <p className="text-sm text-muted-foreground text-center">{movie.year || 'Year unknown'}</p>
      </div>
    </Card>
  )
})
