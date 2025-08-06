import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'movies'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('title').notNullable()
      table.integer('year').notNullable().unsigned()
      table.integer('trakt').notNullable().unique().unsigned()
      table.string('imdb').notNullable().unique()
      table.integer('tmdb').notNullable().unique().unsigned()
      table.jsonb('tg_metadata').notNullable()
      table.jsonb('metadata').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
