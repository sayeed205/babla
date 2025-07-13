import { Dispatcher } from '@mtcute/dispatcher'
import { TelegramClient } from '@mtcute/node'
import crypto from 'node:crypto'

import env from '#start/env'

export class TGService {
  tg: TelegramClient
  dp: Dispatcher

  constructor() {
    this.tg = new TelegramClient({
      apiId: env.get('TG_API_ID'),
      apiHash: env.get('TG_API_HASH'),
      enableErrorReporting: true,
    })
    this.dp = Dispatcher.for(this.tg)
  }

  verifyTGAuth(authData: Record<string, any>) {
    const { hash, ...data } = authData

    const dataCheckString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join('\n')

    const secretKey = crypto.createHash('sha256').update(env.get('TG_MAIN_BOT_TOKEN')).digest()

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    return calculatedHash === hash
  }
}
