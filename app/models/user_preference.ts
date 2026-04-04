import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import User from '#models/user'

export default class UserPreference extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userDid: string

  @belongsTo(() => User, { foreignKey: 'userDid' })
  declare user: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare profileLexicon: string | null

  @column()
  declare uploadSources: string[] | null

  @column()
  declare followTargets: string[] | null

  @column()
  declare consentDataStorage: boolean

  @column()
  declare consentNotifications: boolean
}
