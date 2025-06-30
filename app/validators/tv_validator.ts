import vine from '@vinejs/vine'

export const tvPaginateValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    limit: vine.number().positive().optional(),
    sort: vine.enum(['title', 'firstAirDate', 'popularity', 'voteAverage', 'voteCount']).optional(),
    order: vine.enum(['asc', 'desc']).optional(),
  })
)
