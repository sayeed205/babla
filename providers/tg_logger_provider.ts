import type { ApplicationService } from '@adonisjs/core/types'

import { TGLoggerService } from '#services/tg_logger_service'
import env from '#start/env'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    'tg:logger': TGLoggerService
  }
}

export default class TgLoggerProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton('tg:logger', async () => {
      const { tg } = await this.app.container.make('tg')
      const logChannelPeer = await tg.resolvePeer(env.get('TG_LOG_CHANNEL'))
      const logChannel = await tg.resolveChannel(logChannelPeer)
      return new TGLoggerService(logChannel)
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
