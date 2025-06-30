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
router
  .resource('tvs', TVShowsController)
  .only(['index', 'show'])
  .where('id', router.matchers.number())
router
  .get('tvs/:tvId/seasons/:seasonNumber', [TVShowsController, 'season'])
  .where('tvId', router.matchers.number())
  .where('seasonNumber', router.matchers.number())
  .as('tvs.season')
router
  .get('tvs/:tvId/seasons/:seasonNumber/episodes/:episodeNumber', [TVShowsController, 'episode'])
  .where('tvId', router.matchers.number())
  .where('seasonNumber', router.matchers.number())
  .where('episodeNumber', router.matchers.number())
  .as('tvs.episode')
router
  .get('tvs/:tvId/seasons/:seasonNumber/episodes/:episodeNumber/stream', [
    TVShowsController,
    'stream',
  ])
  .where('tvId', router.matchers.number())
  .where('seasonNumber', router.matchers.number())
  .where('episodeNumber', router.matchers.number())
  .as('tvs.episode.stream')
