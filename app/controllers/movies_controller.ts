import type { HttpContext } from '@adonisjs/core/http'

import Movie from '#models/movie'
import { moviePaginateValidator } from '#validators/movie_validator'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import cache from '@adonisjs/cache/services/main'
import bindMovie from '#decorators/bind_movie'

export default class MoviesController {
  async index({ request }: HttpContext) {
    const {
      page = 1,
      limit = 20,
      order = 'asc',
      sort = 'title',
      search = '',
    } = await moviePaginateValidator.validate(request.qs())

    const safeLimit = Math.min(limit || 1, 20)

    const moviesQuery = Movie.query()

    if (search) {
      moviesQuery.whereRaw('title % ?', [search])
      moviesQuery.orWhereILike('title', `%${search}%`)
      moviesQuery.orderByRaw('similarity(title, ?) DESC', [search])
    }

    moviesQuery.orderBy(sort, order)

    const movies = await moviesQuery.paginate(page || 1, safeLimit)

    movies.baseUrl(router.makeUrl('api.movies.index'))

    const data = movies.all().map((movie) => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      poster: movie.poster,
    }))

    return {
      meta: movies.getMeta(),
      data,
    }
  }

  @bindMovie()
  async show({}: HttpContext, movie: Movie) {
    const tmdb = await app.container.make('tmdb')
    return cache.getOrSet({
      key: `movie-info-${movie.id}`,
      factory: async () => await tmdb.movies.details(movie.tmdb, ['images', 'credits', 'videos']),
      grace: '24h',
      ttl: '24h',
      tags: ['movie-info'],
    })
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
