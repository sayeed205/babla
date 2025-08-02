import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import { withTimestamps } from '#models/utils/with_timestamps'
import Collection from '#models/collection'

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

  @column()
  declare collectionId?: string | null

  @belongsTo(() => Collection)
  declare collection: BelongsTo<typeof Collection>
}
