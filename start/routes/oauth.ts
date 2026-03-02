import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'

// UI route
router.get('login', [controllers.Oauth, 'showLogin']).use(middleware.guest())

// Protocol routes
router.post('/oauth/logout', [controllers.Oauth, 'handleLogout']).use(middleware.auth())

router.group(() => {
  router.post('/oauth/login', [controllers.Oauth, 'handleLogin'])
  router.post('/oauth/signup', [controllers.Oauth, 'handleSignup'])
  router.get('/oauth/callback', [controllers.Oauth, 'callback'])
})
