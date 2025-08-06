// components/MovieList.tsx
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { useState } from 'react'
import { MovieCard } from '@/features/movies/components/movie-card.tsx'
import { apiQuery } from '@/lib/api-client.ts'
import { Link } from '@tanstack/react-router'
import { Main } from '@/components/layout/main.tsx'
import { Header } from '@/components/layout/header.tsx'

const ITEMS_PER_PAGE = 10

export default function MovieList() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = apiQuery.useQuery('get', '/movies', {
    params: {
      query: {
        page,
        limit: ITEMS_PER_PAGE,
        sort: 'title',
        order: 'asc',
      },
    },
    // ✅ this makes sure it refetches when `page` changes
    queryKey: ['movies', page],
    staleTime: 0,
    keepPreviousData: true,
  })

  if (isLoading) {
    return <div>Loading movies...</div>
  }

  if (!data || !data.data) {
    return <div>Failed to load movies.</div>
  }

  const totalPages = Math.ceil((data.meta.total ?? 0) / ITEMS_PER_PAGE)

  return (
    <>
      <Header fixed></Header>
      <Main>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.map((movie) => (
              <Link key={movie.id} to={`/movies/${movie.id}`}>
                <MovieCard id={movie.id} />
              </Link>
            ))}
          </div>

          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationLink
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  isActive={false}
                  className={page === 1 ? 'pointer-events-none opacity-50' : ''}
                >
                  Prev
                </PaginationLink>
              </PaginationItem>

              {Array.from({ length: totalPages }).map((_, i) => (
                <PaginationItem key={i}>
                  <PaginationLink isActive={i + 1 === page} onClick={() => setPage(i + 1)}>
                    {i + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationLink
                  onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                  isActive={false}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : ''}
                >
                  Next
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </Main>
    </>
  )
}
