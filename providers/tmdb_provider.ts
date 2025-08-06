import type { ApplicationService } from '@adonisjs/core/types'
import { TMDB } from 'tmdb-ts'

import env from '#start/env'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    tmdb: TMDB
  }
}

export default class TmdbProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton('tmdb', () => new TMDB(env.get('TMDB_API_KEY')))
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
