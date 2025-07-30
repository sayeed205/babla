import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'collections'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigInteger('id').unsigned().primary()
      table.string('title').notNullable()
      table.text('overview').notNullable()
      table.string('poster').notNullable()
      table.string('backdrop').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
    //
    // const meilisearch = await app.container.make('meilisearch')
    // await meilisearch.createIndex(this.tableName, { primaryKey: 'id' })
    //
    // const res = await fetch(
    //   `${meilisearch.config.host}/indexes/${this.tableName}/settings/embedders`,
    //   {
    //     method: 'PATCH',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${env.get('MEILISEARCH_API_KEY')}`,
    //     },
    //     body: JSON.stringify({
    //       'collection-openai': {
    //         source: 'openAi',
    //         apiKey: env.get('OPENAI_API_KEY'),
    //         model: 'text-embedding-3-small',
    //         documentTemplate:
    //           "A movie collection titled '{{doc.title}}' that features a series of films. Overview: {{doc.overview}}. " +
    //           'It brings together related stories, characters, or themes into a single cinematic universe or narrative arc.',
    //       },
    //     }),
    //   }
    // )
    //
    // if (!res.ok) {
    //   throw new Error(`Failed to create embedder: ${await res.text()}`)
    // }
    // const json = await res.json()
    // logger.info(json, `${this.tableName}: created meilisearch index and embedder`)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
