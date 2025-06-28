import type { HttpContext } from '@adonisjs/core/http'

import Movie from '#models/movie'
import { moviePaginateValidator } from '#validators/movie_validator'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

export default class MoviesController {
  async index({ request }: HttpContext) {
    const { page, limit, order, sort } = await moviePaginateValidator.validate(request.qs())
    const movies = await Movie.query()
      .select([
        'id',
        'title',
        'release_date',
        'poster',
        'runtime',
        'popularity',
        'vote_average',
        'vote_count',
        'adult',
        'collection_id',
      ])
      .preload('collection', (q) => {
        q.select(['id', 'title', 'poster'])
      })
      .orderBy(sort ? sort : 'title', order ? order : 'asc')
      .paginate(page ? page : 1, limit ? limit : 10)

    movies.baseUrl(router.makeUrl('movies.index'))

    return movies
  }

  async show({ params, response }: HttpContext) {
    const movie = await Movie.find(params.id)

    if (!movie) return response.notFound({ message: 'Movie not found' })

    return movie
  }

  async stream({ request, response, params }: HttpContext) {
    const movie = await Movie.find(params.id)
    if (!movie) return response.notFound({ message: 'Movie not found' })

    const { size, type } = movie.meta
    const range = request.header('range')

    let start = 0
    let end = size - 1
    let contentLength = size

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      start = parseInt(parts[0], 10)
      end = parts[1] ? parseInt(parts[1], 10) : size - 1

      // Validate range (NEW: end boundary check)
      if (isNaN(start) || isNaN(end) || start >= size || end >= size || start > end) {
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
    response.header('Content-Type', type)
    response.header('Accept-Ranges', 'bytes')
    response.header('Content-Disposition', `inline; filename="${movie.title}.${movie.meta.ext}"`)
    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.header('Access-Control-Allow-Headers', 'Range, Content-Type')

    // Calculate precise download parameters
    const tgOffset = start
    const tgLimit = contentLength

    const { tg } = await app.container.make('tg')
    const tgStream = tg.downloadAsNodeStream(movie.tgMeta.fileId, {
      offset: tgOffset,
      limit: tgLimit,
    })

    return response.stream(tgStream)
  }
}
