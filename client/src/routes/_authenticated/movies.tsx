import { createFileRoute } from '@tanstack/react-router'

import MoviesPage from '@/features/movies/page'
import { validateMoviesSearch } from '@/features/movies/types/search-params'

export const Route = createFileRoute('/_authenticated/movies')({
  component: MoviesPage,
  validateSearch: validateMoviesSearch,
})
