import factory from '@adonisjs/lucid/factories'
import UserPreference from '#models/user_preference'

export const UserPreferenceFactory = factory
  .define(UserPreference, async ({ faker }) => {
    return {}
  })
  .build()