import { compose } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import {
  BaseModel,
  beforeCreate,
  beforeDelete,
  column,
  hasMany,
  hasManyThrough,
} from '@adonisjs/lucid/orm'

import { ImageTypeEnum, type ExtraVideos, type MediaLinks } from '#types/media'
import type { HasMany, HasManyThrough } from '@adonisjs/lucid/types/relations'

import Episode from '#models/episode'
import Season from '#models/season'
import withID from '#models/utils/with_id'
import { withImages } from '#models/utils/with_images'
import { withTimestamps } from '#models/utils/with_timestamps'

export default class TV extends compose(BaseModel, withID(), withTimestamps(), withImages('tvs')) {
  @column()
  declare title: string

  @column()
  declare originalTitle: string

  @column()
  declare overview: string

  @column()
  declare firstAirDate: string

  @column()
  declare lastAirDate: string

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

  @column()
  declare homepage: string

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

  @hasMany(() => Season)
  declare seasons: HasMany<typeof Season>

  @hasManyThrough([() => Episode, () => Season])
  declare episodes: HasManyThrough<typeof Episode>

  @beforeCreate()
  public static async embedSeason(tv: TV) {
    const meilisearch = await app.container.make('meilisearch')
    const movieIndex = await meilisearch.getIndex('tvs')
    await movieIndex.addDocuments([
      {
        id: tv.id,
        title: tv.title,
        originalTitle: tv.originalTitle,
        overview: tv.overview,
        voteAverage: tv.voteAverage,
        voteCount: tv.voteCount,
        adult: tv.adult,
        genres: tv.genres,
        homepage: tv.homepage,
        popularity: tv.popularity,
        ...(await tv.getImages(ImageTypeEnum.POSTER)),
      },
    ])
  }

  @beforeDelete()
  public static async deleteSeason(tv: TV) {
    const meilisearch = await app.container.make('meilisearch')
    const movieIndex = await meilisearch.getIndex('tvs')
    await movieIndex.deleteDocument(tv.id)
  }
}
