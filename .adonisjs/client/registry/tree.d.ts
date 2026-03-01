/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  oauth: {
    logout: typeof routes['oauth.logout']
    login: typeof routes['oauth.login']
    signup: typeof routes['oauth.signup']
    callback: typeof routes['oauth.callback']
  }
  home: typeof routes['home']
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
}
