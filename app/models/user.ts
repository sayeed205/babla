import encryption from '@adonisjs/core/services/encryption'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column } from '@adonisjs/lucid/orm'

import type { TokenResponse } from '@hitarashi/trakt/types'

import { withTimestamps } from '#models/utils/with_timestamps'

export default class User extends compose(BaseModel, withTimestamps()) {
  static accessTokens = DbAccessTokensProvider.forModel(User)

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare firstName: string | null

  @column()
  declare lastName: string | null

  @column()
  declare username: string | null

  @column()
  declare avatar: string | null

  @column({
    prepare: (value: string | null) => (value ? encryption.encrypt(value) : null),
    consume: (value: string | null) => (value ? encryption.decrypt(value) : null),
    serializeAs: null,
  })
  declare trakt: TokenResponse | null
}
