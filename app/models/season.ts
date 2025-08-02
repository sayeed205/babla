import { compose } from '@adonisjs/core/helpers'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'

import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Episode from '#models/episode'
import TV from '#models/tv'
import withID from '#models/utils/with_id'
import { withTimestamps } from '#models/utils/with_timestamps'

export default class Season extends compose(BaseModel, withID(), withTimestamps()) {
  @column()
  declare number: number

  @column()
  declare trakt: number

  @column()
  declare tvdb: number

  @column()
  declare tmdb: number

  @column()
  declare tvId: string

  @hasMany(() => Episode)
  declare episodes: HasMany<typeof Episode>

  @belongsTo(() => TV)
  declare tvShow: BelongsTo<typeof TV>
}
