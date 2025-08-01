import vine from '@vinejs/vine'

export const traktPollValidator = vine.compile(
  vine.object({
    code: vine.string(),
  })
)
