import { ImageTypeEnum } from '#types/media'
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'images'

  async up() {
    await this.db.rawQuery('DROP TYPE IF EXISTS image_type_enum')
    this.schema.createTable(this.tableName, (table) => {
      table.string('id', 25).primary()
      table
        .enum('type', Object.values(ImageTypeEnum), {
          enumName: 'image_type_enum',
          useNative: true,
          existingType: false,
          schemaName: 'public',
        })
        .notNullable()
      table.string('path').notNullable()
      table.string('table_name').notNullable()
      table.bigInteger('collection_id').notNullable()
    })
  }

  async down() {
    await this.db.rawQuery('DROP TYPE IF EXISTS image_type_enum')
    this.schema.dropTable(this.tableName)
  }
}
