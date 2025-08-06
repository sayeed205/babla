import { createFileRoute } from '@tanstack/react-router'

import MoviesPage from '@/features/movies/page'

export const Route = createFileRoute('/_authenticated/movies')({
  component: MoviesPage,
})
