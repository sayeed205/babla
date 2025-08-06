import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'movies'

  async up() {
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS pg_trgm')

    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('title').notNullable()
      table.integer('year').notNullable().unsigned()
      table.integer('trakt').notNullable().unique().unsigned()
      table.string('imdb').notNullable().unique()
      table.integer('tmdb').notNullable().unique().unsigned()
      table.string('poster').notNullable().unique()
      table.jsonb('tg_metadata').notNullable()
      table.jsonb('metadata').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })

    this.schema.raw(
      `CREATE INDEX movies_title_trgm_idx ON ${this.tableName} USING GIN (title gin_trgm_ops)`
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
    this.schema.raw('DROP EXTENSION IF EXISTS pg_trgm')
  }
}
