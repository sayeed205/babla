/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

const MoviesController = () => import('#controllers/movies_controller')
router.resource('movies', MoviesController).only(['index', 'show'])

router.get('/', async () => {
  return {
    hello: 'world',
  }
})
