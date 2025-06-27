import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column } from '@adonisjs/lucid/orm'

import withID from '#models/utils/with_id'
import { withTimestamps } from '#models/utils/with_timestamps'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder, withID(), withTimestamps()) {
  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  static accessTokens = DbAccessTokensProvider.forModel(User)
}
