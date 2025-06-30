import type { HttpContext } from '@adonisjs/core/http'

import Season from '#models/season'
import TV from '#models/tv'
import { ImageTypeEnum } from '#types/media'
import { tvPaginateValidator } from '#validators/tv_validator'
import router from '@adonisjs/core/services/router'

export default class TvsController {
  async index({ request }: HttpContext) {
    const { page, limit, order, sort } = await tvPaginateValidator.validate(request.all())

    const tvs = await TV.query()
      .select([
        'id',
        'title',
        'first_air_date',
        'last_air_date',
        'popularity',
        'vote_average',
        'vote_count',
        'adult',
      ])
      .orderBy(sort ? sort : 'title', order ? order : 'asc')
      .paginate(page ? page : 1, limit ? (limit > 20 ? 20 : limit) : 20)

    tvs.baseUrl(router.makeUrl('tvs.index'))
    const data: any[] = []

    for (const tv of tvs) {
      data.push({
        ...tv.toJSON(),
        ...(await tv.getImages(ImageTypeEnum.POSTER)),
      })
    }

    return {
      meat: tvs.getMeta(),
      data,
    }
  }

  async show({ params, response }: HttpContext) {
    const tv = await TV.query()
      .where('id', params.id)
      .select([
        'id',
        'title',
        'originalTitle',
        'overview',
        'firstAirDate',
        'lastAirDate',
        'popularity',
        'voteAverage',
        'voteCount',
        'adult',
        'genres',
      ])
      .preload('seasons', (query) => {
        query
          .select(['id', 'title', 'seasonNumber', 'voteAverage'])
          .orderBy('seasonNumber')
          .withCount('episodes', (q) => q.as('totalEpisodes'))
      })
      .first()
    if (!tv) return response.notFound({ message: 'TV Show not found' })

    const data: any[] = []
    for (const season of tv?.seasons || []) {
      const { tvId, ...t } = season.toJSON()
      data.push({
        ...t,
        ...(await season.getImages(ImageTypeEnum.POSTER)),
        totalEpisodes: Number.parseInt(season.$extras.totalEpisodes),
      })
    }

    return {
      ...tv.toJSON(),
      seasons: data,
    }
  }

  async season({ params, response }: HttpContext) {
    const season = await Season.query()
      .select(['id', 'title', 'seasonNumber', 'airDate', 'overview', 'voteAverage', 'tvId'])
      .where('tvId', params.tvId)
      .andWhere('seasonNumber', params.seasonNumber)
      .preload('tvShow', (query) => {
        query.select(['id', 'title', 'originalTitle']).preload('seasons', (q) => {
          q.select(['id', 'seasonNumber', 'title']).orderBy('seasonNumber')
        })
      })
      .preload('episodes', (query) => {
        query
          .select([
            'id',
            'airDate',
            'episodeNumber',
            'title',
            'overview',
            'runtime',
            'voteAverage',
            'runtime',
            'voteCount',
          ])
          .orderBy('episodeNumber')
      })
      .first()
    if (!season) return response.notFound({ message: 'Season not found' })

    const [seasonImages, tvImages] = await Promise.all([
      season.getImages(ImageTypeEnum.POSTER),
      season.tvShow.getImages(ImageTypeEnum.POSTER, ImageTypeEnum.BACKDROP, ImageTypeEnum.LOGO),
    ])

    const episodes = await Promise.all(
      season.episodes.map(async (episode) => {
        const thumb = await episode.getImages(ImageTypeEnum.THUMBNAIL)
        const { seasonId, ...data } = episode.toJSON()
        return { ...data, ...thumb }
      })
    )

    const tvShow = season.tvShow
    const tvShowSeasons = tvShow.seasons.map(({ id, seasonNumber, title }) => ({
      id,
      seasonNumber,
      title,
    }))

    return {
      id: season.id,
      title: season.title,
      seasonNumber: season.seasonNumber,
      airDate: season.airDate,
      overview: season.overview,
      voteAverage: season.voteAverage,
      poster: seasonImages.poster,
      episodes,
      tvShow: {
        id: tvShow.id,
        title: tvShow.title,
        originalTitle: tvShow.originalTitle,
        poster: tvImages.poster,
        backdrop: tvImages.backdrop,
        logo: tvImages.logo,
        seasons: tvShowSeasons,
      },
    }
  }
  async episode({}: HttpContext) {}
  async stream({}: HttpContext) {}
}
