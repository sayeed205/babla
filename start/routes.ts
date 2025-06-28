/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

/*
|--------------------------------------------------------------------------
| API DOCS Routes
|--------------------------------------------------------------------------
*/
const DocsController = () => import('#controllers/docs_controller')
router.get('docs', [DocsController, 'index']).as('docs.index')
router.get('docs/swagger.json', [DocsController, 'swagger']).as('docs.swagger')

/*
|--------------------------------------------------------------------------
| COLLECTIONS Routes
|--------------------------------------------------------------------------
*/
const CollectionsController = () => import('#controllers/collections_controller')
router
  .resource('collections', CollectionsController)
  .only(['index', 'show'])
  .where('id', router.matchers.number())

/*
|--------------------------------------------------------------------------
| MOVIES Routes
|--------------------------------------------------------------------------
*/
const MoviesController = () => import('#controllers/movies_controller')
router
  .resource('movies', MoviesController)
  .only(['index', 'show'])
  .where('id', router.matchers.number())
router
  .get('movies/:id/stream', [MoviesController, 'stream'])
  .as('movies.stream')
  .where('id', router.matchers.number())

/*
|--------------------------------------------------------------------------
| TV SHOWS Routes
|--------------------------------------------------------------------------
*/
const TVShowsController = () => import('#controllers/tvs_controller')
