import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OAuthController = () => import('#controllers/oauth_controller')

// UI route
router.get('login', [OAuthController, 'showLogin']).as('login').use(middleware.guest())

// Protocol routes
router
  .post('/oauth/logout', [OAuthController, 'handleLogout'])
  .as('oauth.logout')
  .use(middleware.auth())

router
  .group(() => {
    router.post('/oauth/login', [OAuthController, 'handleLogin']).as('login')
    router.post('/oauth/signup', [OAuthController, 'handleSignup']).as('signup')
    router.get('/oauth/callback', [OAuthController, 'callback']).as('callback')
  })
  .as('oauth')
