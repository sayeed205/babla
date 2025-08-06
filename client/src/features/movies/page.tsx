// components/MovieList.tsx
import { Header } from '@/components/layout/header.tsx'
import { Main } from '@/components/layout/main.tsx'
import { PaginationControls } from '@/components/pagination-controls'
import { SearchInput } from '@/components/search-input'
import {
    getMoviesSearchParamsWithDefaults,
    type MoviesSearchParams,
} from '@/features/movies/types/search-params'
import { apiQuery } from '@/lib/api-client.ts'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { FilterBar } from './components/filter-bar'
import { MovieGrid } from './components/movie-grid'

export default function MovieList() {
  const searchParams = useSearch({ from: '/_authenticated/movies' })
  const navigate = useNavigate()

  // Memoize search params with defaults to prevent unnecessary re-renders
  const normalizedSearchParams = useMemo(
    () => getMoviesSearchParamsWithDefaults(searchParams),
    [searchParams]
  )
  const { page, limit, sort, order, search } = normalizedSearchParams

  // Memoized function to update search params for better performance
  const updateSearchParams = useCallback(
    (updates: Partial<MoviesSearchParams>) => {
      navigate({
        to: '/movies',
        search: (prev) => {
          const merged = { ...prev, ...updates }
          // Ensure we don't lose any existing parameters
          return {
            page: merged.page,
            limit: merged.limit,
            sort: merged.sort,
            order: merged.order,
            search: merged.search,
          }
        },
      })
    },
    [navigate]
  )

  const { data, isLoading, error } = apiQuery.useQuery('get', '/movies', {
    params: {
      query: {
        page,
        limit,
        sort,
        order,
        ...(search && { search }),
      },
    },
    // Structured query key for proper cache invalidation and management
    queryKey: [
      'movies',
      'list',
      {
        page,
        limit,
        sort,
        order,
        ...(search && { search }),
      },
    ],
    staleTime:0,
    gcTime: 0,
    placeholderData: (previousData: any) => previousData,
    refetchOnWindowFocus: true,
  })

  // We'll handle loading and error states in the MovieGrid component

  return (
    <>
      <Header fixed>
        <div className="flex-1 max-w-md">
          <SearchInput
            value={search || ''}
            onChange={(value) => updateSearchParams({ search: value, page: 1 })}
            placeholder="Search movies..."
            className="w-full"
          />
        </div>
      </Header>
      <Main>
        <div className="space-y-0">
          <FilterBar
            searchParams={{ page, limit, sort, order, search }}
            totalResults={data?.meta.total ?? 0}
            onUpdateSearchParams={updateSearchParams}
          />
          <div className="p-6 space-y-6">
            <MovieGrid
              movies={data?.data ?? []}
              isLoading={isLoading}
              error={error}
              searchTerm={search}
            />

            {data?.meta && (
              <PaginationControls
                meta={data.meta}
                onPageChange={(newPage) => updateSearchParams({ page: newPage })}
              />
            )}
          </div>
        </div>
      </Main>
    </>
  )
}
