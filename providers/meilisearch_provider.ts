import env from '#start/env'
import type { ApplicationService } from '@adonisjs/core/types'
import { MeiliSearch } from 'meilisearch'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    meilisearch: MeiliSearch
  }
}

export default class MeilisearchProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton('meilisearch', () => {
      return new MeiliSearch({
        host: env.get('MEILISEARCH_HOST'),
        apiKey: env.get('MEILISEARCH_API_KEY'),
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
