import { Skeleton } from '@/components/ui/skeleton'
import { SearchX } from 'lucide-react'
import { memo, useMemo } from 'react'
import { MovieCard } from './movie-card'

interface Movie {
  id: string
  title: string
  year: number
}

interface MovieGridProps {
  movies: Movie[]
  isLoading: boolean
  error: any // Accept any error type from the API query
  searchTerm?: string
}

const MovieGridSkeleton = memo(function MovieGridSkeleton() {
  // Memoize skeleton items to prevent unnecessary re-renders
  const skeletonItems = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => (
        <div key={index} className="w-full max-w-[160px] sm:max-w-none space-y-3">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <div className="space-y-2 px-1">
            <Skeleton className="h-5 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        </div>
      )),
    []
  )

  return (
    <div className="grid gap-4 md:gap-6 justify-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {skeletonItems}
    </div>
  )
})

const EmptyState = memo(function EmptyState({ searchTerm }: { searchTerm?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-6 mb-6">
        <SearchX className="h-12 w-12 text-muted-foreground" />
      </div>

      {searchTerm ? (
        <>
          <h3 className="text-xl font-semibold text-foreground mb-2">No movies found</h3>
          <p className="text-muted-foreground mb-1">No movies found matching "{searchTerm}"</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search terms or browse all movies
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-semibold text-foreground mb-2">No movies available</h3>
          <p className="text-muted-foreground">There are no movies to display at the moment</p>
        </>
      )}
    </div>
  )
})

export const MovieGrid = memo(function MovieGrid({
  movies,
  isLoading,
  error,
  searchTerm,
}: MovieGridProps) {
  // Memoize movie cards to prevent unnecessary re-renders
  const movieCards = useMemo(
    () =>
      movies.map((movie, index) => (
        <div key={movie.id} className="w-full max-w-[160px] sm:max-w-none">
          <MovieCard
            id={movie.id}
            priority={index < 12} // Prioritize first 12 movies (above-the-fold)
          />
        </div>
      )),
    [movies]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-destructive/10 p-6 mb-6">
          <SearchX className="h-12 w-12 text-destructive" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Failed to load movies</h3>
        <p className="text-muted-foreground">
          {error?.message || 'An error occurred while loading movies'}
        </p>
      </div>
    )
  }

  if (isLoading) {
    return <MovieGridSkeleton />
  }

  if (movies.length === 0) {
    return <EmptyState searchTerm={searchTerm} />
  }

  return (
    <div className="grid gap-4 md:gap-6 justify-items-center grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {movieCards}
    </div>
  )
})
