import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { apiQuery } from '@/lib/api-client.ts'
import { Badge } from '@/components/ui/badge.tsx'
import { Star } from 'lucide-react'

interface MovieCardProps {
  id: string
}

export function MovieCard({ id }: MovieCardProps) {
  const {
    data: imageData,
    isLoading: imageLoading,
    error: imageError,
  } = apiQuery.useQuery('get', '/movies/{id}/images', {
    params: {
      path: { id },
    },
  })

  const { data: movieData } = apiQuery.useQuery('get', '/movies/{id}/info', {
    params: {
      path: { id },
    },
  })

  if (imageLoading) {
    return <Skeleton className="h-48 w-full rounded-xl" />
  }

  if (imageError || !imageData) {
    return <div className="text-sm text-red-500">Failed to load movie image.</div>
  }

  return (
    <Card className="group relative overflow-hidden border-0 bg-card shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg">
        {/* Main poster image */}
        <img
          src={imageData.movieposter[0]?.url || '/placeholder.svg?height=600&width=400'}
          alt={imageData.name}
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Rating badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-black/50 text-white border-0 backdrop-blur-sm">
            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
            {movieData?.rating.toFixed(1)}
          </Badge>
        </div>
      </div>

      {/* Movie title (fallback if no logo) */}
      <div className="p-4 group-hover:bg-black/5 transition-colors duration-300">
        <h3 className="font-bold text-lg text-center text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {imageData.name}
        </h3>
        <p className="text-sm text-muted-foreground text-center mt-1">1996 • Action, Adventure</p>
      </div>
    </Card>
  )
}
