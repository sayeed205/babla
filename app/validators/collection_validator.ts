import vine from '@vinejs/vine'

export const collectionPaginateValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    limit: vine.number().positive().optional(),
    order: vine.enum(['asc', 'desc']).optional(),
  })
)
