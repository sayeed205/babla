import vine from '@vinejs/vine'

vine.convertEmptyStringsToNull = true
export const moviePaginateValidator = vine.compile(
  vine.object({
    page: vine.number().positive().withoutDecimals().optional(),
    limit: vine.number().positive().withoutDecimals().optional(),
    sort: vine.enum(['title', 'year']).optional(),
    order: vine.enum(['asc', 'desc']).optional(),
  })
)
