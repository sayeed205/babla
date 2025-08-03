import { Fanart } from '@hitarashi/fanart'

import type { ApplicationService } from '@adonisjs/core/types'
import env from '#start/env'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    fanart: Fanart
  }
}

export default class FanartProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton('fanart', () => {
      return new Fanart(env.get('FANART_API_KEY'))
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
