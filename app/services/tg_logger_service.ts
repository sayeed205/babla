import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { tl } from '@mtcute/node'

export class TGLoggerService {
  constructor(private readonly logChannel: tl.TypeInputChannel) {}

  async trace<T extends object>(obj: T, message?: string, ...values: any[]): Promise<void>
  async trace(obj: unknown, message?: string, ...values: any[]): Promise<void>
  async trace(message: string, ...values: any[]): Promise<void>
  async trace(arg1: any, arg2?: any, ...values: any[]) {
    const { tg } = await app.container.make('tg')

    logger.trace(arg1, arg2, ...values)
    await tg.sendText(this.logChannel, JSON.stringify(arg1, null, 2))
  }

  async debug<T extends object>(obj: T, message?: string, ...values: any[]): Promise<void>
  async debug(obj: unknown, message?: string, ...values: any[]): Promise<void>
  async debug(message: string, ...values: any[]): Promise<void>
  async debug(mergingObject: any, message: string, ...values: any[]): Promise<void> {
    const { tg } = await app.container.make('tg')
    logger.debug(mergingObject, message, ...values)
    await tg.sendText(this.logChannel, JSON.stringify(mergingObject, null, 2))
  }

  async info<T extends object>(obj: T, message?: string, ...values: any[]): Promise<void>
  async info(obj: unknown, message?: string, ...values: any[]): Promise<void>
  async info(message: string, ...values: any[]): Promise<void>
  async info(mergingObject: any, message: string, ...values: any[]): Promise<void> {
    const { tg } = await app.container.make('tg')
    logger.info(mergingObject, message, ...values)
    await tg.sendText(this.logChannel, JSON.stringify(mergingObject, null, 2))
  }
}
