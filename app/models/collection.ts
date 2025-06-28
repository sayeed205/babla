import { compose } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import { BaseModel, beforeCreate, beforeDelete, column, hasMany } from '@adonisjs/lucid/orm'

import type { HasMany } from '@adonisjs/lucid/types/relations'

import Movie from '#models/movie'
import withID from '#models/utils/with_id'
import { withTimestamps } from '#models/utils/with_timestamps'

export default class Collection extends compose(BaseModel, withID(), withTimestamps()) {
  @column()
  declare title: string

  @column()
  declare overview: string

  @column()
  declare poster: string

  @column()
  declare backdrop: string

  @hasMany(() => Movie)
  declare movies: HasMany<typeof Movie>

  @beforeCreate()
  public static async embedCollection(collection: Collection) {
    const meilisearch = await app.container.make('meilisearch')
    const movieIndex = await meilisearch.getIndex('collections')
    await movieIndex.addDocuments([
      {
        id: collection.id,
        title: collection.title,
        overview: collection.overview,
      },
    ])
  }

  @beforeDelete()
  public static async deleteCollection(collection: Collection) {
    const meilisearch = await app.container.make('meilisearch')
    const movieIndex = await meilisearch.getIndex('collections')
    await movieIndex.deleteDocument(collection.id)
  }
}
