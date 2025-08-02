import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'seasons'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 25).primary()
      table.smallint('number').unsigned().notNullable()
      table.integer('trakt').notNullable().unsigned().unique()
      table.integer('tvdb').notNullable().unsigned().unique()
      table.integer('tmdb').notNullable().unsigned().unique()
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
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
