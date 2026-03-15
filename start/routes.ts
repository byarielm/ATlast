/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import '#start/routes/oauth'

router.on('/').renderInertia('home', {}).as('home')
router.on('/login').renderInertia('auth/login', {}).as('login')

//router.group(() => {}).use(middleware.guest())
//router.group(() => {}).use(middleware.auth())
