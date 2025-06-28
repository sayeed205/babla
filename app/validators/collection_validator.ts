import vine from '@vinejs/vine'

export const collectionPaginateValidator = vine.compile(
  vine.object({
    page: vine.number().positive().optional(),
    limit: vine
      .number()
      .positive()
      .optional()
      .transform((v) => (v > 20 ? 20 : v)),
    order: vine.enum(['asc', 'desc']).optional(),
  })
)
