import { compose } from '@adonisjs/core/helpers'
import app from '@adonisjs/core/services/app'
import { BaseModel, beforeCreate, beforeDelete, belongsTo, column } from '@adonisjs/lucid/orm'

import type { ExtraVideos, MediaLinks, MediaMeta, TGMeta } from '#types/media'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import Season from '#models/season'
import withID from '#models/utils/with_id'
import { withImages } from '#models/utils/with_images'
import { withTimestamps } from '#models/utils/with_timestamps'
import { ImageTypeEnum } from '#types/media'

export default class Episode extends compose(
  BaseModel,
  withID(),
  withTimestamps(),
  withImages('episodes')
) {
  @column()
  declare airDate: string

  @column()
  declare episodeNumber: number

  @column()
  declare title: string

  @column()
  declare overview: string

  @column()
  declare runtime: number

  @column()
  declare voteAverage: number

  @column()
  declare voteCount: number

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

  @column({
    consume: (value) => value,
    prepare: (value) => JSON.stringify(value),
    serializeAs: null,
  })
  declare tgMeta: TGMeta

  @column()
  declare seasonId: string

  @belongsTo(() => Season)
  declare season: BelongsTo<typeof Season>

  @beforeCreate()
  public static async embedEpisode(episode: Episode) {
    const meilisearch = await app.container.make('meilisearch')
    const episodeIndex = await meilisearch.getIndex('episodes')

    await episodeIndex.addDocuments([
      {
        id: episode.id,
        title: episode.title,
        overview: episode.overview,
        runtime: episode.runtime,
        vote_average: episode.voteAverage,
        vote_count: episode.voteCount,
        meta: episode.meta,
        ...(await episode.getImages(ImageTypeEnum.THUMBNAIL)),
      },
    ])
  }

  @beforeDelete()
  public static async deleteEpisode(episode: Episode) {
    const meilisearch = await app.container.make('meilisearch')
    const episodeIndex = await meilisearch.getIndex('episodes')

    await episodeIndex.deleteDocument(episode.id)
  }
}
