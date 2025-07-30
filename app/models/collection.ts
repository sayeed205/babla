import { compose } from '@adonisjs/core/helpers'
import { BaseModel, hasMany } from '@adonisjs/lucid/orm'

import type { HasMany } from '@adonisjs/lucid/types/relations'

import Movie from '#models/movie'
import withID from '#models/utils/with_id'
import { withTimestamps } from '#models/utils/with_timestamps'

export default class Collection extends compose(BaseModel, withID(), withTimestamps()) {
  @hasMany(() => Movie)
  declare movies: HasMany<typeof Movie>
}
