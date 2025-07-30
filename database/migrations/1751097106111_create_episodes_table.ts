import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'episodes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigInteger('id').unsigned().primary()
      table.date('air_date').notNullable()
      table.integer('episode_number').unsigned().notNullable()
      table.text('title').notNullable()
      table.text('overview').notNullable()
      table.integer('runtime').unsigned().notNullable()
      table.float('vote_average').unsigned().notNullable()
      table.float('vote_count').unsigned().notNullable()
      table.jsonb('videos').nullable()
      table.json('links').nullable()
      table.jsonb('meta').notNullable()
      table.jsonb('tg_meta').notNullable()
      table
        .bigInteger('season_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('seasons')
        .onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })

    // const meilisearch = await app.container.make('meilisearch')
    //
    // await meilisearch.createIndex(this.tableName, { primaryKey: 'id' })
    //
    // const episodeTask = await meilisearch.index(this.tableName).updateSettings({
    //   distinctAttribute: 'id',
    //   searchableAttributes: ['title', 'overview'],
    //   sortableAttributes: ['episode_number', 'vote_average', 'vote_count', 'air_date'],
    //   embedders: {
    //     'episode-openai': {
    //       source: 'openAi',
    //       apiKey: env.get('OPENAI_API_KEY'),
    //       model: 'text-embedding-3-small',
    //       documentTemplate:
    //         `Episode {{doc.episode_number}} titled "{{doc.title}}" aired on {{doc.air_date}}. ` +
    //         `It has a runtime of {{doc.runtime}} minutes, an average rating of {{doc.vote_average}} ` +
    //         `based on {{doc.vote_count}} votes. Overview: {{doc.overview}}.`,
    //     },
    //   },
    // })
    //
    // logger.info(episodeTask, `${this.tableName}: created Meilisearch index and embedder`)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
