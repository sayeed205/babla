import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'

import type { HasMany } from '@adonisjs/lucid/types/relations'

import Movie from '#models/movie'
import { withTimestamps } from '#models/utils/with_timestamps'

export default class Collection extends compose(BaseModel, withTimestamps()) {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare name: string

  @column()
  declare trakt: number

  @hasMany(() => Movie)
  declare movies: HasMany<typeof Movie>
}
