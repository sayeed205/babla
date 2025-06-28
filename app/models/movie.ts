import { compose } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import { BaseModel, beforeCreate, beforeDelete, belongsTo, column } from '@adonisjs/lucid/orm'

import type { ExtraVideos, MediaLinks, MediaMeta, TGMeta } from '#types/media'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Collection from '#models/collection'
import withID from '#models/utils/with_id'
import { withImages } from '#models/utils/with_images'
import { withTimestamps } from '#models/utils/with_timestamps'
import { ImageTypeEnum } from '#types/media'

export default class Movie extends compose(
  BaseModel,
  withID(),
  withTimestamps(),
  withImages('movies')
) {
  @column()
  declare title: string

  @column()
  declare originalTitle: string

  @column()
  declare releaseDate: string

  @column()
  declare overview: string

  @column()
  declare tagline: string

  @column()
  declare runtime: number

  @column()
  declare popularity: number

  @column()
  declare voteAverage: number

  @column()
  declare voteCount: number

  @column()
  declare adult: boolean

  @column()
  declare genres: string[]

  @column({
    consume: (value) => value,
    prepare: (value) => JSON.stringify(value),
    serializeAs: null,
  })
  declare tgMeta: TGMeta

  @column({
    consume: (value) => value,
    prepare: (value) => JSON.stringify(value),
  })
  declare videos: ExtraVideos[]

  @column({
    consume: (value) => value,
    prepare: (value) => JSON.stringify(value),
  })
  declare links: MediaLinks[]

  @column({
    consume: (value) => value,
    prepare: (value) => JSON.stringify(value),
  })
  declare meta: MediaMeta

  @column()
  declare homepage: string

  @column()
  declare productionCountries: string[]

  @column()
  declare collectionId: string | null

  @belongsTo(() => Collection)
  declare collection: BelongsTo<typeof Collection>

  @beforeCreate()
  public static async embedMovie(movie: Movie) {
    const meilisearch = await app.container.make('meilisearch')
    const movieIndex = await meilisearch.getIndex('movies')
    await movieIndex.addDocuments([
      {
        id: movie.id,
        title: movie.title,
        originalTitle: movie.originalTitle,
        tagline: movie.tagline,
        overview: movie.overview,
        runtime: movie.runtime,
        popularity: movie.popularity,
        voteAverage: movie.voteAverage,
        voteCount: movie.voteCount,
        adult: movie.adult,
        releaseDate: movie.releaseDate,
        genres: movie.genres,
        ...(await movie.getImages(ImageTypeEnum.POSTER)),
      },
    ])
  }

  @beforeDelete()
  public static async deleteMovie(movie: Movie) {
    const meilisearch = await app.container.make('meilisearch')
    const movieIndex = await meilisearch.getIndex('movies')
    await movieIndex.deleteDocument(movie.id)
  }
}
