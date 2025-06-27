import type { HttpContext } from '@adonisjs/core/http'

import Movie from '#models/movie'
import { moviePaginateValidator } from '#validators/movie_validator'
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
      ])
      .if(sort, (q) => q.orderBy(sort!, order ? order : 'asc'))
      .paginate(page ? page : 1, limit ? limit : 10)

    movies.baseUrl(router.makeUrl('movies.index'))

    return movies
  }

  async show({ params }: HttpContext) {
    const movie = await Movie.findOrFail(params.id)

    return movie
  }
}
