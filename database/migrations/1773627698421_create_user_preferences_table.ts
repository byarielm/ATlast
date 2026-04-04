import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'user_preferences'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()
      table.string('user_did').references('did').inTable('users').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.string('profile_lexicon')
      table.json('upload_sources').nullable()
      table.json('follow_targets').nullable()
      table.boolean('consent_data_storage').defaultTo(false).notNullable()
      table.boolean('consent_notifications').defaultTo(false).notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
