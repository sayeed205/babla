import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import withID from '#models/utils/with_id'
import { withTimestamps } from '#models/utils/with_timestamps'

export default class AuthSession extends compose(BaseModel, withID(), withTimestamps()) {
  @column()
  declare tgId: string | null

  @column()
  declare verifiedAt: DateTime
}
