import { type HttpContext } from '@adonisjs/core/http'

import Movie from '#models/movie'

const bindMovie = () => (_target: any, _key: any, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value

  descriptor.value = async function (this: any, ctx: HttpContext) {
    const { params, response } = ctx

    const movie = await Movie.find(params.id)
    if (!movie) return response.notFound({ message: 'Movie not found' })

    return originalMethod.call(this, ctx, movie)
  }
  return descriptor
}

export default bindMovie
