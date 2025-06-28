import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'

import Image from '#models/image'
import { ImageTypeEnum } from '#types/media'
import { BaseModel } from '@adonisjs/lucid/orm'

type ModelWithImages = {
  getImages: (...types: ImageTypeEnum[]) => Promise<Record<ImageTypeEnum, string>>
}

type ModelWithImagesClass<
  Model extends NormalizeConstructor<typeof BaseModel> = NormalizeConstructor<typeof BaseModel>,
> = Model & {
  new (...args: any[]): ModelWithImages
}

export function withImages(tableName: string) {
  return <T extends NormalizeConstructor<typeof BaseModel>>(
    superclass: T
  ): ModelWithImagesClass<T> => {
    class ModelWithImages extends superclass {
      async getImages(...types: ImageTypeEnum[]): Promise<Record<ImageTypeEnum, string>> {
        const images = await Image.query()
          .distinctOn('type')
          .select('id', 'type', 'path')
          .whereIn('type', types)
          // @ts-ignore
          .andWhere('collection_id', this.id)
          .andWhere('table_name', tableName)
          .orderBy('type')
          .orderByRaw('RANDOM()')
        const result: Record<ImageTypeEnum, string> = Object.fromEntries(
          types.map((type) => [type, ''])
        ) as Record<ImageTypeEnum, string>

        for (const image of images) {
          result[image.type as ImageTypeEnum] = image.path
        }

        return result
      }
    }
    return ModelWithImages as ModelWithImagesClass<T>
  }
}
