import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seasons'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigInteger('id').unsigned().primary()
      table.date('air_date').nullable()
      table.string('title').notNullable()
      table.text('overview').notNullable()
      table.integer('season_number').unsigned().notNullable().defaultTo(0)
      table.float('vote_average').unsigned().notNullable().defaultTo(0)
      table.jsonb('videos').nullable()
      table.jsonb('links').nullable()
      table
        .bigInteger('tv_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('tvs')
        .onDelete('CASCADE')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    // const meilisearch = await app.container.make('meilisearch')
    // await meilisearch.createIndex(this.tableName, { primaryKey: 'id' })
    //
    // const seasonTask = await meilisearch.index(this.tableName).updateSettings({
    //   distinctAttribute: 'id',
    //   searchableAttributes: ['title', 'overview'],
    //   sortableAttributes: ['season_number', 'vote_average', 'air_data'],
    //   embedders: {
    //     'season-openai': {
    //       source: 'openAi',
    //       apiKey: env.get('OPENAI_API_KEY'),
    //       model: 'text-embedding-3-small',
    //       documentTemplate:
    //         `Season {{doc.season_number}} titled "{{doc.title}}" aired on {{doc.air_data}}. ` +
    //         `It received an average vote of {{doc.vote_average}}. Overview: {{doc.overview}}.`,
    //     },
    //   },
    // })
    //
    // logger.info(seasonTask, `${this.tableName}: created meilisearch index and embedder`)
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
