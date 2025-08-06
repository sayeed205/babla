// Search params interface for movies page
export interface MoviesSearchParams {
  page?: number
  limit?: number
  sort?: 'title' | 'year'
  order?: 'asc' | 'desc'
  search?: string
}

// Default values for search parameters
export const DEFAULT_MOVIES_SEARCH_PARAMS: Required<MoviesSearchParams> = {
  page: 1,
  limit: 20,
  sort: 'title',
  order: 'asc',
  search: '',
}

// Validation function for search parameters
export function validateMoviesSearch(search: Record<string, unknown>): MoviesSearchParams {
  const page =
    typeof search.page === 'string'
      ? parseInt(search.page, 10)
      : typeof search.page === 'number'
        ? search.page
        : undefined
  const limit =
    typeof search.limit === 'string'
      ? parseInt(search.limit, 10)
      : typeof search.limit === 'number'
        ? search.limit
        : undefined
  const sort =
    typeof search.sort === 'string' && ['title', 'year'].includes(search.sort)
      ? (search.sort as 'title' | 'year')
      : undefined
  const order =
    typeof search.order === 'string' && ['asc', 'desc'].includes(search.order)
      ? (search.order as 'asc' | 'desc')
      : undefined
  const searchTerm = typeof search.search === 'string' ? search.search : undefined

  return {
    page: page && page > 0 ? page : undefined,
    limit: limit && [12, 16, 20].includes(limit) ? limit : undefined,
    sort,
    order,
    search: searchTerm,
  }
}

// Helper function to get search params with defaults applied
export function getMoviesSearchParamsWithDefaults(
  searchParams: MoviesSearchParams
): Required<MoviesSearchParams> {
  return {
    page: searchParams.page ?? DEFAULT_MOVIES_SEARCH_PARAMS.page,
    limit: searchParams.limit ?? DEFAULT_MOVIES_SEARCH_PARAMS.limit,
    sort: searchParams.sort ?? DEFAULT_MOVIES_SEARCH_PARAMS.sort,
    order: searchParams.order ?? DEFAULT_MOVIES_SEARCH_PARAMS.order,
    search: searchParams.search ?? DEFAULT_MOVIES_SEARCH_PARAMS.search,
  }
}
