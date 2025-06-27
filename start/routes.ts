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
router.get('docs', [DocsController, 'index'])
router.get('docs/swagger.json', [DocsController, 'swagger'])

/*
|--------------------------------------------------------------------------
| MOVIES Routes
|--------------------------------------------------------------------------
*/
const MoviesController = () => import('#controllers/movies_controller')
router.resource('movies', MoviesController).only(['index', 'show'])
