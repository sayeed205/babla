import router from '@adonisjs/core/services/router'

import Collection from '#models/collection'

import { ImageTypeEnum } from '#types/media'
import { collectionPaginateValidator } from '#validators/collection_validator'
import type { HttpContext } from '@adonisjs/core/http'

export default class CollectionsController {
  async index({ request }: HttpContext) {
    const {
      page = 1,
      limit = 20,
      order,
    } = await collectionPaginateValidator.validate(request.all())
    const safeLimit = Math.min(limit || 1, 20)
    const collections = await Collection.query()
      .select(['id', 'title', 'poster'])
      .withCount('movies', (q) => q.as('totalMovies'))
      .orderBy('title', order)
      .paginate(page || 1, safeLimit)

    collections.baseUrl(router.makeUrl('collections.index'))
    const data = collections.all().map((collection) => ({
      ...collection.toJSON(),
      totalMovies: Number(collection.$extras.totalMovies),
    }))

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

    const movies = await Promise.all(
      collection.movies.map(async (movie) => {
        const { collectionId, ...data } = movie.toJSON()
        const images = await movie.getImages(ImageTypeEnum.POSTER)
        return {
          ...data,
          ...images,
        }
      })
    )

    return {
      ...collection.toJSON(),
      movies,
    }
  }
}
