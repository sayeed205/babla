import type { HttpContext } from '@adonisjs/core/http'
import crypto from 'node:crypto'

import Movie from '#models/movie'
import { moviePaginateValidator } from '#validators/movie_validator'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'
import cache from '@adonisjs/cache/services/main'
import bindMovie from '#decorators/bind_movie'

export default class MoviesController {
  private readonly SIGNING_SECRET = process.env.STREAM_SIGNING_SECRET || 'your-secret-key'
  private readonly URL_EXPIRY = 3600 // 1 hour in seconds

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

  @bindMovie()
  async getStreamUrl({}: HttpContext, movie: Movie) {
    // Create expiration timestamp
    const expiresAt = Math.floor(Date.now() / 1000) + this.URL_EXPIRY

    // Create signature payload
    const payload = {
      movieId: movie.id,
      expiresAt,
    }

    // Generate signature
    const signature = this.generateSignature(payload)

    // Create the signed streaming URL
    const streamUrl = router.makeUrl(
      'api.movies.stream',
      { id: movie.id },
      {
        qs: {
          expires: expiresAt,
          signature,
        },
      }
    )

    return {
      streamUrl,
      expiresAt,
      expiresIn: this.URL_EXPIRY,
    }
  }

  @bindMovie()
  async stream({ request, response }: HttpContext, movie: Movie) {
    // Verify signed URL
    const expires = request.input('expires')
    const signature = request.input('signature')

    if (!this.verifySignature(movie.id, expires, signature)) {
      return response.unauthorized({
        message: 'Invalid or expired streaming URL',
      })
    }

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

  /**
   * Generate HMAC signature for URL signing
   */
  private generateSignature(payload: { movieId: string; expiresAt: number }): string {
    const data = `${payload.movieId}-${payload.expiresAt}`
    return crypto.createHmac('sha256', this.SIGNING_SECRET).update(data).digest('hex')
  }

  /**
   * Verify the signature and expiration of a signed URL
   */
  private verifySignature(movieId: string, expires: string, signature: string): boolean {
    if (!expires || !signature) {
      return false
    }

    const expiresAt = Number.parseInt(expires, 10)

    // Check if URL has expired
    if (Number.isNaN(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
      return false
    }

    // Generate expected signature
    const expectedSignature = this.generateSignature({
      movieId,
      expiresAt,
    })

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  }
}
