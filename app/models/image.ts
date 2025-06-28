import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'

import withID from '#models/utils/with_id'
import { ImageTypeEnum } from '#types/media'

export default class Image extends compose(BaseModel, withID()) {
  @column()
  declare type: ImageTypeEnum

  @column()
  declare path: string

  @column()
  declare tableName: string

  @column()
  declare collectionId: string
}
