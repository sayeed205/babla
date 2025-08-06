// components/MovieList.tsx
import { Header } from '@/components/layout/header.tsx'
import { Main } from '@/components/layout/main.tsx'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
} from '@/components/ui/pagination'
import { MovieCard } from '@/features/movies/components/movie-card.tsx'
import {
    getMoviesSearchParamsWithDefaults,
    type MoviesSearchParams,
} from '@/features/movies/types/search-params'
import { apiQuery } from '@/lib/api-client.ts'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { FilterBar } from './components/filter-bar'

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

    const { data, isLoading } = apiQuery.useQuery('get', '/movies', {
        params: {
            query: {
                page,
                limit,
                sort,
                order,
            },
        },
        // Include all search params in query key for proper cache invalidation
        queryKey: ['movies', { page, limit, sort, order }],
        staleTime: 24 * 60 * 60 * 1000, // 24 hours as per requirements
        keepPreviousData: true,
    })

    if (isLoading) {
        return <div>Loading movies...</div>
    }

    if (!data || !data.data) {
        return <div>Failed to load movies.</div>
    }

    const totalPages = Math.ceil((data.meta.total ?? 0) / limit)

    return (
        <>
            <Header fixed></Header>
            <Main>
                <div className="space-y-0">
                    <FilterBar
                        searchParams={{ page, limit, sort, order, search: searchParams.search || '' }}
                        totalResults={data.meta.total ?? 0}
                        onUpdateSearchParams={updateSearchParams}
                    />
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {data.data.map((movie) => (
                                <div key={movie.id}>
                                    <MovieCard id={movie.id} />
                                </div>
                            ))}
                        </div>

                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationLink
                                        onClick={() => updateSearchParams({ page: Math.max(page - 1, 1) })}
                                        isActive={false}
                                        className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                                    >
                                        Prev
                                    </PaginationLink>
                                </PaginationItem>

                                {Array.from({ length: totalPages }).map((_, i) => (
                                    <PaginationItem key={i}>
                                        <PaginationLink
                                            isActive={i + 1 === page}
                                            onClick={() => updateSearchParams({ page: i + 1 })}
                                        >
                                            {i + 1}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}

                                <PaginationItem>
                                    <PaginationLink
                                        onClick={() => updateSearchParams({ page: Math.min(page + 1, totalPages) })}
                                        isActive={false}
                                        className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                                    >
                                        Next
                                    </PaginationLink>
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            </Main>
        </>
    )
}
