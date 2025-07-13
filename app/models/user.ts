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
  static accessTokens = DbAccessTokensProvider.forModel(User)

  @column()
  declare firstName: string | null

  @column()
  declare lastName: string | null

  @column()
  declare username: string | null

  @column()
  declare avatar: string | null
}
