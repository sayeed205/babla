import { compose } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import {
  BaseModel,
  beforeCreate,
  beforeDelete,
  belongsTo,
  column,
  hasMany,
} from '@adonisjs/lucid/orm'

import type { ExtraVideos, MediaLinks } from '#types/media'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

import Episode from '#models/episode'
import TV from '#models/tv'
import withID from '#models/utils/with_id'
import { withImages } from '#models/utils/with_images'
import { withTimestamps } from '#models/utils/with_timestamps'
import { ImageTypeEnum } from '#types/media'

export default class Season extends compose(
  BaseModel,
  withID(),
  withTimestamps(),
  withImages('seasons')
) {
  @column()
  declare airDate: string

  @column()
  declare title: string

  @column()
  declare overview: string

  @column()
  declare seasonNumber: number

  @column()
  declare voteAverage: number

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

  @column()
  declare tvId: string

  @hasMany(() => Episode)
  declare episodes: HasMany<typeof Episode>

  @belongsTo(() => TV)
  declare tvShow: BelongsTo<typeof TV>

  @beforeCreate()
  public static async embedSeason(season: Season) {
    const meilisearch = await app.container.make('meilisearch')
    const movieIndex = await meilisearch.getIndex('seasons')
    await movieIndex.addDocuments([
      {
        id: season.id,
        title: season.title,
        overview: season.overview,
        seasonNumber: season.seasonNumber,
        voteAverage: season.voteAverage,
        ...(await season.getImages(ImageTypeEnum.POSTER)),
        airDate: season.airDate,
      },
    ])
  }

  @beforeDelete()
  public static async deleteSeason(season: Season) {
    const meilisearch = await app.container.make('meilisearch')
    const movieIndex = await meilisearch.getIndex('seasons')
    await movieIndex.deleteDocument(season.id)
  }
}
