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
import { FilterBar } from './components/filter-bar'
import { MovieGrid } from './components/movie-grid'

export default function MovieList() {
  const searchParams = useSearch({ from: '/_authenticated/movies' })
  const navigate = useNavigate()

  // Apply default values for undefined search params
  const { page, limit, sort, order } = getMoviesSearchParamsWithDefaults(searchParams)

  // Function to update search params
  const updateSearchParams = (updates: Partial<MoviesSearchParams>) => {
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
  }

  const { data, isLoading, error } = apiQuery.useQuery('get', '/movies', {
    params: {
      query: {
        page,
        limit,
        sort,
        order,
        ...(searchParams.search && { search: searchParams.search }),
      },
    },
    // Include all search params in query key for proper cache invalidation
    queryKey: ['movies', { page, limit, sort, order, search: searchParams.search }],
    staleTime: 0, // No caching for movies list queries - always fetch fresh data
    cacheTime: 0, // Don't keep in cache
    keepPreviousData: false, // Don't keep previous data to ensure fresh results
  })

  // We'll handle loading and error states in the MovieGrid component

  return (
    <>
      <Header fixed>
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchParams.search || ''}
            onChange={(value) => updateSearchParams({ search: value, page: 1 })}
            placeholder="Search movies..."
            className="w-full"
          />
        </div>
      </Header>
      <Main>
        <div className="space-y-0">
          <FilterBar
            searchParams={{ page, limit, sort, order, search: searchParams.search || '' }}
            totalResults={data?.meta.total ?? 0}
            onUpdateSearchParams={updateSearchParams}
          />
          <div className="p-6 space-y-6">
            <MovieGrid
              movies={data?.data ?? []}
              isLoading={isLoading}
              error={error}
              searchTerm={searchParams.search}
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
