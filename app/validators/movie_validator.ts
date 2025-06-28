import vine from '@vinejs/vine'

export const moviePaginateValidator = vine.compile(
  vine.object({
    page: vine.number().min(1).optional(),
    limit: vine.number().min(1).max(20).optional(),
    sort: vine.enum(['title', 'releaseDate', 'popularity', 'voteAverage', 'voteCount']).optional(),
    order: vine.enum(['asc', 'desc']).optional(),
  })
)
