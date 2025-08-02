import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'episodes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 25).primary()
      table.integer('season').unsigned().notNullable()
      table.integer('number').unsigned().notNullable()
      table.string('title').notNullable()
      table.integer('trakt').unsigned().notNullable().unique()
      table.integer('tvdb').unsigned().notNullable().unique()
      table.integer('tmdb').unsigned().notNullable().unique()
      table.string('imdb').notNullable()
      table.text('title').notNullable()
      table.jsonb('metadata').notNullable()
      table.jsonb('tg_metadata').notNullable()
      table
        .string('season_id', 25)
        .notNullable()
        .references('id')
        .inTable('seasons')
        .onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
