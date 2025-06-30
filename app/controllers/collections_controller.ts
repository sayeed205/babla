import router from '@adonisjs/core/services/router'

import Collection from '#models/collection'

import { ImageTypeEnum } from '#types/media'
import { collectionPaginateValidator } from '#validators/collection_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class CollectionsController {
  async index({ request }: HttpContext) {
    const { page, limit, order } = await collectionPaginateValidator.validate(request.all())
    const collections = await Collection.query()
      .select(['id', 'title', 'poster'])
      .withCount('movies', (q) => q.as('totalMovies'))
      .orderBy('title', order)
      .paginate(page ? page : 1, limit)

    collections.baseUrl(router.makeUrl('collections.index'))
    const data: any[] = []
    for (const collection of collections) {
      data.push({
        ...collection.toJSON(),
        totalMovies: Number.parseInt(collection.$extras.totalMovies),
      })
    }
    return {
      meta: collections.getMeta(),
      data,
    }
  }

  async show({ params, response }: HttpContext) {
    const collection = await Collection.query()
      .where('id', params.id)
      .select(['id', 'title', 'overview', 'poster', 'backdrop'])
      .preload('movies', (q) => {
        q.select([
          'id',
          'title',
          'release_date',
          'runtime',
          'popularity',
          'vote_average',
          'vote_count',
          'adult',
        ])
          .orderBy('release_date')
          .orderBy('title', 'asc')
      })
      .first()
    if (!collection) return response.notFound({ message: 'Collection not found' })
    const movies: any[] = []

    for (const movie of collection.movies) {
      const { collectionId, ...m } = movie.toJSON()
      movies.push({
        ...m,
        ...(await movie.getImages(ImageTypeEnum.POSTER)),
      })
    }
    return {
      ...collection.toJSON(),
      movies,
    }
  }
}
