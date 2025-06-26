import type { NormalizeConstructor } from '@adonisjs/core/types/helpers'
import { type BaseModel, column } from '@adonisjs/lucid/orm'
import type { DateTime } from 'luxon'

type ModelWithTimestampsRow = {
  createdAt: DateTime
  updatedAt: DateTime
}

type ModelWithTimestampsClass<
  Model extends NormalizeConstructor<typeof BaseModel> = NormalizeConstructor<typeof BaseModel>,
> = Model & {
  new (...args: any[]): ModelWithTimestampsRow
}

export function withTimestamps() {
  return <T extends NormalizeConstructor<typeof BaseModel>>(
    superclass: T
  ): ModelWithTimestampsClass<T> => {
    class ModelWithTimestamps extends superclass {
      @column.dateTime({ autoCreate: true })
      declare createdAt: DateTime

      @column.dateTime({ autoCreate: true, autoUpdate: true })
      declare updatedAt: DateTime
    }

    return ModelWithTimestamps as unknown as ModelWithTimestampsClass<T>
  }
}
