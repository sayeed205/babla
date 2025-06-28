import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { BaseSchema } from '@adonisjs/lucid/schema'

import env from '#start/env'

export default class extends BaseSchema {
  protected tableName = 'tvs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigInteger('id').unsigned().primary()
      table.string('title').notNullable()
      table.string('original_title').notNullable()
      table.text('overview').notNullable()
      table.date('first_air_date').notNullable()
      table.date('last_air_date').notNullable()
      table.float('popularity').unsigned().notNullable()
      table.float('vote_average').unsigned().notNullable()
      table.integer('vote_count').unsigned().notNullable()
      table.boolean('adult').notNullable().defaultTo(false)
      table.specificType('genres', 'varchar(50)[]').notNullable()
      table.string('homepage').notNullable().defaultTo('')
      table.jsonb('videos').nullable()
      table.jsonb('links').nullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    const meilisearch = await app.container.make('meilisearch')
    await meilisearch.createIndex(this.tableName, { primaryKey: 'id' })

    const tvTask = await meilisearch.index(this.tableName).updateSettings({
      distinctAttribute: 'id',
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness'],
      sortableAttributes: ['popularity', 'vote_average', 'vote_count'],
      searchableAttributes: ['title', 'overview', 'genres', 'tagline'],
      embedders: {
        'tv-openai': {
          source: 'openAi',
          apiKey: env.get('OPENAI_API_KEY'),
          model: 'text-embedding-3-small',
          documentTemplate:
            `A TV show titled '{{doc.title}}', originally titled '{{doc.originalTitle}}', about {{doc.overview}}. ` +
            `Genres include {{doc.genres | join: ", "}}. Popularity score is {{doc.popularity}} with ` +
            `an average vote of {{doc.voteAverage}} from {{doc.voteCount}} votes. ` +
            `Adult content: {{doc.adult}}. More info at {{doc.homepage}}.`,
        },
      },
    })

    logger.info(tvTask, `${this.tableName}: created meilisearch index and embedder`)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
