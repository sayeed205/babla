import type { HttpContext } from '@adonisjs/core/http'

import Episode from '#models/episode'
import Season from '#models/season'
import TV from '#models/tv'
import { tvPaginateValidator } from '#validators/tv_validator'
import app from '@adonisjs/core/services/app'
import router from '@adonisjs/core/services/router'

export default class TvsController {
  async index({ request }: HttpContext) {
    const {
      page = 1,
      limit = 20,
      order,
      sort = 'title',
    } = await tvPaginateValidator.validate(request.all())
    const safeLimit = Math.min(limit || 1, 20)

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
      .orderBy(sort, order)
      .paginate(page || 1, safeLimit)

    tvs.baseUrl(router.makeUrl('tvs.index'))

    const data = await Promise.all(
      tvs.all().map(async (tv) => ({
        ...tv.toJSON(),
      }))
    )

    return {
      meta: tvs.getMeta(), // ✅ typo fixed
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

    const episodes = await Promise.all(
      season.episodes.map(async (episode) => {
        const { seasonId, ...data } = episode.toJSON()
        return { ...data }
      })
    )

    const tvShow = season.tvShow

    return {
      id: season.id,
      episodes,
      tvShow: {
        id: tvShow.id,
        title: tvShow.title,
      },
    }
  }

  async episode({ params, response }: HttpContext) {
    const { tvId, seasonNumber, episodeNumber } = params

    const tvShow = await TV.query()
      .where('id', tvId)
      .select(['id', 'title', 'originalTitle'])
      .preload('seasons', (seasonQuery) => {
        seasonQuery.where('seasonNumber', seasonNumber).preload('episodes', (episodeQuery) => {
          episodeQuery.orderBy('episodeNumber')
        })
      })
      .first()

    if (!tvShow) return response.notFound({ message: 'TV show not found' })

    const season = tvShow.seasons[0]
    if (!season) return response.notFound({ message: 'Season not found' })

    const episode = season.episodes.find((ep) => ep.number === Number(episodeNumber))
    if (!episode) return response.notFound({ message: 'Episode not found' })

    const moreEpisodes = season.episodes
      .filter((ep) => ep.number !== Number(episodeNumber))
      .map((ep) => ({
        id: ep.id,
        episodeNumber: ep.number,
        title: ep.title,
      }))
    const { seasonId, ...episodeData } = episode.toJSON()
    return {
      ...episodeData,
      more: moreEpisodes,
      tvShow: {
        id: tvShow.id,
        title: tvShow.title,
      },
    }
  }

  async stream({ request, response, params }: HttpContext) {
    const { tvId, seasonNumber, episodeNumber } = params

    // Find the exact episode
    const episode = await Episode.query()
      .select(['id', 'title', 'meta', 'tgMeta'])
      .whereHas('seasonInfo', (seasonQuery) => {
        seasonQuery.where('tvId', tvId).where('seasonNumber', seasonNumber)
      })
      .where('episodeNumber', episodeNumber)
      .first()

    if (!episode) return response.notFound({ message: 'Episode not found' })

    const { size, mimeType } = episode.metadata
    const range = request.header('range')

    let start = 0
    let end = size - 1
    let contentLength = size

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      start = Number.parseInt(parts[0], 10)
      end = parts[1] ? Number.parseInt(parts[1], 10) : end

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

    // Set headers
    response.header('Content-Length', contentLength.toString())
    response.header('Content-Type', mimeType)
    response.header('Accept-Ranges', 'bytes')
    // response.header('Content-Disposition', `inline; filename="${episode.title}.${ext}"`)
    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.header('Access-Control-Allow-Headers', 'Range, Content-Type')

    // Telegram stream
    const { tg } = await app.container.make('tg')
    const tgStream = tg.downloadAsNodeStream(episode.tgMetadata.fileId, {
      offset: start,
      limit: contentLength,
    })

    return response.stream(tgStream)
  }
}
