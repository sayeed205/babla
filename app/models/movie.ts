import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'

import withID from '#models/utils/with_id'
import { withTimestamps } from '#models/utils/with_timestamps'
import type { ExtraVideos, MediaLinks, MediaMeta } from '#types/media'

export default class Movie extends compose(BaseModel, withID(), withTimestamps()) {
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
  declare poster: string

  @column()
  declare backdrop: string

  @column()
  declare logo?: string

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
}
