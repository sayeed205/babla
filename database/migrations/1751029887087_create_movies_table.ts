import env from '#start/env'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'movies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigInteger('id').unsigned().primary()
      table.string('title').notNullable()
      table.string('original_title').notNullable()
      table.date('release_date').notNullable()
      table.text('overview').notNullable()
      table.string('tagline').notNullable()
      table.integer('runtime').notNullable().unsigned()
      table.float('popularity').notNullable().unsigned()
      table.float('vote_average').notNullable().unsigned()
      table.integer('vote_count').notNullable().unsigned()
      table.boolean('adult').notNullable()
      table.specificType('genres', 'varchar(50)[]').notNullable()
      table.text('homepage').notNullable()
      table.jsonb('tg_meta').notNullable()
      table.jsonb('videos').nullable()
      table.jsonb('links').nullable()
      table.jsonb('meta').notNullable()
      table.specificType('production_countries', 'text[]').notNullable()
      table
        .bigInteger('collection_id')
        .unsigned()
        .nullable()
        .defaultTo(null)
        .references('id')
        .inTable('collections')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    const meilisearch = await app.container.make('meilisearch')
    await meilisearch.createIndex(this.tableName, { primaryKey: 'id' })

    const movieTask = await meilisearch.index(this.tableName).updateSettings({
      distinctAttribute: 'id',
      rankingRules: ['words', 'typo', 'proximity', 'attribute', 'exactness'],
      sortableAttributes: ['popularity', 'vote_average', 'vote_count'],
      searchableAttributes: ['title', 'overview', 'tagline', 'genres'],
      embedders: {
        'movie-openai': {
          source: 'openAi',
          apiKey: env.get('OPENAI_API_KEY'),
          model: 'text-embedding-3-small',
          documentTemplate:
            'A movie titled "{{doc.title}}" tells the story: {{doc.overview}}. ' +
            'It belongs to the genres {{doc.genres | join: ", "}} and is tagged with "{{doc.tagline}}". ' +
            'Originally released on {{doc.releaseDate}}, the film was first titled "{{doc.originalTitle}}". ' +
            'It runs for {{doc.runtime}} minutes. ' +
            'With a popularity score of {{doc.popularity}}, it has an average rating of {{doc.voteAverage}} based on {{doc.voteCount}} votes.',
        },
      },
    })

    logger.info(movieTask, `${this.tableName}: created meilisearch index and embedder`)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
