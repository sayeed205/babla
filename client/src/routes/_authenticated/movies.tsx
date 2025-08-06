import { createFileRoute } from '@tanstack/react-router'

import MoviesPage from '@/features/movies/page'
import {
  validateMoviesSearch,
  type MoviesSearchParams,
} from '@/features/movies/types/search-params'

export const Route = createFileRoute('/_authenticated/movies')({
  component: MoviesPage,
  validateSearch: (search: Record<string, unknown>): MoviesSearchParams =>
    validateMoviesSearch(search),
})
