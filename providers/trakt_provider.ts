import type { ApplicationService } from '@adonisjs/core/types'
import Trakt from '@hitarashi/trakt'
import env from '#start/env'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    trakt: Trakt
  }
}

export default class TraktProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton('trakt', () => {
      return new Trakt({
        client_id: env.get('TRAKT_CLIENT_ID'),
        client_secret: env.get('TRAKT_CLIENT_SECRET'),
        user_agent: 'Babla',
      })
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
