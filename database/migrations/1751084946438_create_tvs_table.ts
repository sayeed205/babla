import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tvs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string('id').primary()
      table.string('title').notNullable()
      table.integer('year').notNullable().unsigned()
      table.integer('trakt').notNullable().unsigned().unique()
      table.integer('tvdb').notNullable().unsigned().unique()
      table.string('imdb').notNullable()
      table.integer('tmdb').unsigned().notNullable().unique()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
