import logger from '@adonisjs/core/services/logger'
import { filters, MessageContext } from '@mtcute/dispatcher'
import type { Document, Video } from '@mtcute/node'
import mime from 'mime'
import { TMDB } from 'tmdb-ts'

import type { ApplicationService } from '@adonisjs/core/types'

import Collection from '#models/collection'
import Episode from '#models/episode'
import Image from '#models/image'
import Movie from '#models/movie'
import Season from '#models/season'
import TV from '#models/tv'
import env from '#start/env'
import { getVideoMetadata, parseMediaInfo, TGMovieCaption, TGShowsCaption } from '#utils/media'
import { TGService } from '#services/tg_service'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    tg: TGService
  }
}

const tmdb = new TMDB(env.get('TMDB_API_KEY'))

export default class TGProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.app.container.singleton('tg', () => {
      return new TGService()
    })
  }

  /**
   * The container bindings have booted
   */
  async boot() {}

  /**
   * The application has been booted
   */
  async start() {
    const { tg } = await this.app.container.make('tg')
    const self = await tg.start({ botToken: env.get('TG_MAIN_BOT_TOKEN') })
    const tgLogger = await this.app.container.make('tg:logger')
    await tgLogger.info(`Logged in Telegram as '${self.displayName}'`)
  }

  /**
   * The process has been started
   */
  async ready() {
    const { dp } = await this.app.container.make('tg')
    dp.onNewMessage(filters.document, handleTGMessage)
    dp.onNewMessage(filters.video, handleTGMessage)
  }

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    const { tg, dp } = await this.app.container.make('tg')
    await tg.disconnect()
    await dp.destroy()
    await tg.destroy()
  }
}

const handleTGMessage = async (
  ctx:
    | filters.Modify<
        MessageContext,
        {
          media: Document
        }
      >
    | filters.Modify<
        MessageContext,
        {
          media: filters.Modify<
            Video,
            {
              isRound: false
              isAnimation: false
            }
          >
        }
      >
) => {
  const { text, media } = ctx
  logger.info(`Processing: ${media.fileName}, ${text}`)
  const meta = parseMediaInfo(text)
  if (!meta) return logger.error(`Failed to parse media info: ${text}`)
  if (meta.type === 'movie') return handleMovie(meta, ctx)
  if (meta.type === 'tv') return handleTV(meta, ctx)
}

const handleMovie = async (
  meta: TGMovieCaption,
  ctx: filters.Modify<
    MessageContext,
    {
      media:
        | Document
        | filters.Modify<
            Video,
            {
              isRound: false
              isAnimation: false
            }
          >
    }
  >
) => {
  const { media, link, text } = ctx
  const movieSearch = await tmdb.search.movies({
    query: meta.title,
    year: meta.year,
    include_adult: true,
  })
  if (!movieSearch.total_results) return logger.error(`No results found for: ${text}`)
  const movieResult = movieSearch.results[0]

  const tmdbMovie = await tmdb.movies.details(movieResult.id, ['videos', 'external_ids', 'images'])

  const movieExists = await Movie.find(tmdbMovie.id.toString())

  if (movieExists) return logger.info(`Movie already exists: ${tmdbMovie.title}`)

  // check if movie has collection
  if (tmdbMovie.belongs_to_collection) {
    const collection = await Collection.find(tmdbMovie.belongs_to_collection.id.toString())
    if (!collection) {
      const tmdbCollection = await tmdb.collections.details(tmdbMovie.belongs_to_collection.id)
      await Collection.create({
        id: tmdbCollection.id.toString(),
        title: tmdbCollection.name,
        poster: tmdbCollection.poster_path,
        backdrop: tmdbCollection.backdrop_path,
        overview: tmdbCollection.overview,
      })
    }
  }

  const movie = await Movie.create({
    id: tmdbMovie.id.toString(),
    title: tmdbMovie.title,
    adult: tmdbMovie.adult,
    genres: tmdbMovie.genres.map((g) => g.name),
    originalTitle: tmdbMovie.original_title,
    popularity: tmdbMovie.popularity,
    homepage: tmdbMovie.homepage,
    tgMeta: { fileId: media.fileId, fileLink: link },
    meta: {
      ...(await getVideoMetadata(media.fileId)),
      type: media.mimeType,
      size: media.fileSize!,
      ext: mime.getExtension(media.mimeType)!,
    },
    collectionId: tmdbMovie.belongs_to_collection?.id.toString() || null,
    overview: tmdbMovie.overview,
    productionCountries: tmdbMovie.production_countries.map((c) => c.name),
    releaseDate: tmdbMovie.release_date,
    runtime: tmdbMovie.runtime,
    tagline: tmdbMovie.tagline,
    videos: tmdbMovie.videos.results
      .filter((video) => {
        return video.site === 'YouTube'
      })
      .map((video) => ({
        key: video.key,
        name: video.name,
        type: video.type,
      })),
    voteAverage: tmdbMovie.vote_average,
    voteCount: tmdbMovie.vote_count,
  })

  // save images
  Image.saveImages('movies', movie.id, tmdbMovie.images)

  await movie.save()
  return logger.info(`Movie ${movie.title}:${meta.year} added`)
}

const handleTV = async (
  meta: TGShowsCaption,
  ctx: filters.Modify<
    MessageContext,
    {
      media:
        | Document
        | filters.Modify<
            Video,
            {
              isRound: false
              isAnimation: false
            }
          >
    }
  >
) => {
  const { media, link } = ctx
  const tvSearch = await tmdb.search.tvShows({
    query: meta.title,
    year: meta.year,
    // first_air_date_year: meta.year,
    include_adult: true,
  })
  if (!tvSearch.total_results) return logger.error(meta, `No results found`)
  const tvResult = tvSearch.results[0]

  // tv checks
  const tmdbTV = await tmdb.tvShows.details(tvResult.id, ['videos', 'external_ids', 'images'])
  let tv = await TV.find(tmdbTV.id.toString())
  if (tv) logger.info(`TV ${tv.title} already exists`)
  if (!tv) {
    tv = await TV.create({
      id: tmdbTV.id.toString(),
      // @ts-ignore
      adult: tmdbTV.adult,
      title: tmdbTV.name,
      originalTitle: tmdbTV.original_name,
      overview: tmdbTV.overview,
      firstAirDate: tmdbTV.first_air_date,
      lastAirDate: tmdbTV.last_air_date,
      genres: tmdbTV.genres.map((genre) => genre.name),
      homepage: tmdbTV.homepage,
      popularity: tmdbTV.popularity,
      voteAverage: tmdbTV.vote_average,
      voteCount: tmdbTV.vote_count,
      videos: tmdbTV.videos.results
        .filter((video) => {
          return video.site === 'YouTube'
        })
        .map((video) => ({
          key: video.key,
          name: video.name,
          type: video.type,
        })),
    })
    await tv.save()
    Image.saveImages('tvs', tv.id, tmdbTV.images)
  }

  // season checks
  const tmdbSeason = await tmdb.tvSeasons.details(
    {
      seasonNumber: meta.season,
      tvShowID: tmdbTV.id,
    },
    ['videos', 'external_ids', 'images']
  )
  let season = await Season.find(tmdbSeason.id.toString())
  if (season) logger.info(`TV ${tv.title} Season ${season.seasonNumber} already exists`)
  if (!season) {
    season = await tv.related('seasons').create({
      id: tmdbSeason.id.toString(),
      seasonNumber: tmdbSeason.season_number,
      title: tmdbSeason.name,
      overview: tmdbSeason.overview,
      airDate: tmdbSeason.air_date,
      // @ts-ignore
      voteAverage: tmdbSeason.vote_average,
      videos: tmdbSeason.videos.results
        .filter((video) => {
          return video.site === 'YouTube'
        })
        .map((video) => ({
          key: video.key,
          name: video.name,
          type: video.type,
        })),
    })
    await season.save()
    Image.saveImages('seasons', season.id, tmdbSeason.images)
  }

  // episode checks
  const tmdbEpisode = await tmdb.tvEpisode.details(
    {
      episodeNumber: meta.episode,
      seasonNumber: meta.season,
      tvShowID: tmdbTV.id,
    },
    ['videos', 'external_ids', 'images']
  )
  const episodeExists = await Episode.find(tmdbEpisode.id.toString())

  if (episodeExists)
    return logger.info(
      `TV ${tv.title} Season ${season.seasonNumber} Episode ${episodeExists.episodeNumber} already exists`
    )

  const episode = await season.related('episodes').create({
    id: tmdbEpisode.id.toString(),
    episodeNumber: tmdbEpisode.episode_number,
    title: tmdbEpisode.name,
    overview: tmdbEpisode.overview,
    airDate: tmdbEpisode.air_date,
    runtime: tmdbEpisode.runtime,
    voteAverage: tmdbEpisode.vote_average,
    voteCount: tmdbEpisode.vote_count,
    tgMeta: { fileId: media.fileId, fileLink: link },
    meta: {
      ...(await getVideoMetadata(media.fileId)),
      type: media.mimeType,
      size: media.fileSize!,
      ext: mime.getExtension(media.mimeType)!,
    },
    videos: tmdbEpisode.videos.results
      .filter((video) => {
        return video.site === 'YouTube'
      })
      .map((video) => ({
        key: video.key,
        name: video.name,
        type: video.type,
      })),
  })
  await episode.save()
  Image.saveImages('episodes', episode.id, tmdbEpisode.images)

  return logger.info(
    `TV ${tv.title} Season ${season.seasonNumber} Episode ${episode.episodeNumber} added`
  )
}
