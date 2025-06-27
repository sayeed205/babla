import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'movies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigInteger('id').primary()
      table.string('title').notNullable()
      table.string('original_title').notNullable()
      table.date('release_date').notNullable()
      table.text('overview').notNullable()
      table.string('tagline').notNullable()
      table.string('poster').notNullable()
      table.string('backdrop').notNullable()
      table.string('logo').nullable()
      table.integer('runtime').notNullable()
      table.float('popularity').notNullable()
      table.float('vote_average').notNullable()
      table.integer('vote_count').notNullable()
      table.boolean('adult').notNullable()
      table.specificType('genres', 'text[]').notNullable()
      table.jsonb('tg_meta').notNullable()
      table.jsonb('videos').notNullable()
      table.jsonb('links').nullable()
      table.text('homepage').notNullable()
      table.jsonb('meta').notNullable()
      table.specificType('production_countries', 'text[]').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    const meilisearch = await app.container.make('meilisearch')
    await meilisearch.createIndex(this.tableName, { primaryKey: 'id' })

    const res = await fetch(
      `${meilisearch.config.host}/indexes/${this.tableName}/settings/embedders`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.get('MEILISEARCH_API_KEY')}`,
        },
        body: JSON.stringify({
          'movie-openai': {
            source: 'openAi',
            apiKey: env.get('OPENAI_API_KEY'),
            model: 'text-embedding-3-small',
            documentTemplate:
              'A movie titled \'{{doc.title}}\' about  {{doc.overview}} genres {{doc.genres | join: ", "}} tags {{doc.tagline}} released on {{doc.releaseDate}}.',
          },
        }),
      }
    )

    if (!res.ok) {
      throw new Error(`Failed to create embedder: ${await res.text()}`)
    }
    const json = await res.json()
    console.log(JSON.stringify(json, null, 2))
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
