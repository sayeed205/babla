import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'

import { withTimestamps } from '#models/utils/with_timestamps'

import type { MediaMetadata, TGMetadata } from '#types/tg'

export default class Movie extends compose(BaseModel, withTimestamps()) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  @column()
  declare year: number

  @column()
  declare trakt: number

  @column()
  declare imdb: string

  @column()
  declare tmdb: number

  @column()
  declare poster: string

  @column({
    consume: (value) => value,
    prepare: (value) => JSON.stringify(value),
    serializeAs: null,
  })
  declare tgMetadata: TGMetadata

  @column({
    consume: (value) => value,
    prepare: (value) => JSON.stringify(value),
  })
  declare metadata: MediaMetadata
}
