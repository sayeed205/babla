import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'

import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import withID from '#models/utils/with_id'
import { withTimestamps } from '#models/utils/with_timestamps'
import Season from '#models/season'
import type { MediaMetadata, TGMetadata } from '#types/tg'

export default class Episode extends compose(BaseModel, withID(), withTimestamps()) {
  @column()
  declare season: number

  @column()
  declare number: number

  @column()
  declare title: string

  @column()
  declare trakt: number

  @column()
  declare tvdb: number

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
  declare seasonId: string

  @belongsTo(() => Season)
  declare seasonInfo: BelongsTo<typeof Season>
}
