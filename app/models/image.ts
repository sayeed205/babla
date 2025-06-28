import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'

import withID from '#models/utils/with_id'
import { ImageTypeEnum } from '#types/media'
import { Images } from 'tmdb-ts'

export default class Image extends compose(BaseModel, withID()) {
  @column()
  declare type: ImageTypeEnum

  @column()
  declare path: string

  @column()
  declare tableName: string

  @column()
  declare collectionId: string

  static async saveImages(tableName: string, collectionId: string, images: Omit<Images, 'id'>) {
    const imageEntries: {
      type: ImageTypeEnum
      path: string
      collectionId: string
      tableName: string
    }[] = []

    for (const [key, value] of Object.entries(images)) {
      const type = key.slice(0, -1) as ImageTypeEnum

      // if (!Object.values(ImageTypeEnum).includes(type)) continue

      const images = value.filter((i) => i.iso_639_1 === 'en' || !i.iso_639_1)

      for (const image of images.slice(0, 5)) {
        imageEntries.push({
          // @ts-ignore
          type: type === 'still' ? ImageTypeEnum.THUMBNAIL : type,
          path: image.file_path,
          collectionId,
          tableName,
        })
      }
    }

    await Image.createMany(imageEntries)
  }
}
