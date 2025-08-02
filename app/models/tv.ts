import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany, hasManyThrough } from '@adonisjs/lucid/orm'

import type { HasMany, HasManyThrough } from '@adonisjs/lucid/types/relations'

import { withTimestamps } from '#models/utils/with_timestamps'
import Season from '#models/season'
import Episode from '#models/episode'

export default class TV extends compose(BaseModel, withTimestamps()) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare title: string

  @column()
  declare year: number

  @column()
  declare trakt: number

  @column()
  declare tvdb: number

  @column()
  declare imdb: string

  @column()
  declare tmdb: number

  @hasMany(() => Season)
  declare seasons: HasMany<typeof Season>

  @hasManyThrough([() => Episode, () => Season])
  declare episodes: HasManyThrough<typeof Episode>
}
