/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  oauth: {
    showLogin: typeof routes['oauth.show_login']
    handleLogout: typeof routes['oauth.handle_logout']
    handleLogin: typeof routes['oauth.handle_login']
    handleSignup: typeof routes['oauth.handle_signup']
    callback: typeof routes['oauth.callback']
  }
  home: typeof routes['home']
}
