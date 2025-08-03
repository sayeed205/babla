import type { HttpContext } from '@adonisjs/core/http'

import Movie from '#models/movie'
import { moviePaginateValidator } from '#validators/movie_validator'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import cache from '@adonisjs/cache/services/main'

export default class MoviesController {
  async index({ request }: HttpContext) {
    const {
      page = 1,
      limit = 20,
      order,
      sort = 'title',
    } = await moviePaginateValidator.validate(request.qs())
    const safeLimit = Math.min(limit || 1, 20)
    const movies = await Movie.query()
      .orderBy(sort, order)
      .paginate(page || 1, safeLimit)

    movies.baseUrl(router.makeUrl('api.movies.index'))
    const trakt = await app.container.make('trakt')
    const data = await Promise.all(
      movies.all().map(async (movie) => {
        const movieId = movie.id
        return {
          id: `movie-${movie.id}`,
          metadata: movie.metadata,
          ...(await cache.getOrSet({
            key: movieId,
            factory: async () => await trakt.movies.get(movieId, true),
            grace: '24h',
            ttl: '24h',
            tags: ['movie'],
          })),
        }
      })
    )
    return {
      meta: movies.getMeta(),
      data,
    }
  }

  async show({ params, response }: HttpContext) {
    const movie = await Movie.query()
      .where('id', params.id)
      .preload('collection', (q) => {
        q.select(['id', 'title', 'poster', 'backdrop'])
      })
      .first()

    if (!movie) return response.notFound({ message: 'Movie not found' })

    return {
      ...movie.toJSON(),
    }
  }

  async stream({ request, response, params }: HttpContext) {
    const movie = await Movie.find(params.id)
    if (!movie) return response.notFound({ message: 'Movie not found' })

    const { size, mimeType } = movie.metadata
    const range = request.header('range')

    let start = 0
    let end = size - 1
    let contentLength = size

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      start = Number.parseInt(parts[0], 10)
      end = parts[1] ? Number.parseInt(parts[1], 10) : size - 1

      // Validate range (NEW: end boundary check)
      if (Number.isNaN(start) || Number.isNaN(end) || start >= size || end >= size || start > end) {
        return response
          .status(416)
          .header('Content-Range', `bytes */${size}`)
          .json({ message: 'Range not satisfiable' })
      }

      contentLength = end - start + 1
      response.status(206)
      response.header('Content-Range', `bytes ${start}-${end}/${size}`)
    } else {
      response.status(200)
    }

    // Unified header configuration
    response.header('Content-Length', contentLength.toString())
    response.header('Content-Type', mimeType)
    response.header('Accept-Ranges', 'bytes')
    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.header('Access-Control-Allow-Headers', 'Range, Content-Type')

    // Calculate precise download parameters
    const tgOffset = start
    const tgLimit = contentLength

    const { tg } = await app.container.make('tg')
    const tgStream = tg.downloadAsNodeStream(movie.tgMetadata.fileId, {
      offset: tgOffset,
      limit: tgLimit,
    })

    return response.stream(tgStream)
  }
}
