import logger from '@adonisjs/core/services/logger'
import { filters, MessageContext } from '@mtcute/dispatcher'
import type { Document, Video } from '@mtcute/node'

import type { ApplicationService } from '@adonisjs/core/types'

import Collection from '#models/collection'
import Episode from '#models/episode'
import Movie from '#models/movie'
import Season from '#models/season'
import TV from '#models/tv'
import env from '#start/env'
import { TGService } from '#services/tg_service'
import app from '@adonisjs/core/services/app'
import { parseMediaText } from '#utils/tg'
import { ParsedMovieText, ParsedShowText } from '#types/tg'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    tg: TGService
  }
}

export default class TGProvider {
  constructor(protected App: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    this.App.container.singleton('tg', () => {
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
    const { tg } = await this.App.container.make('tg')
    const self = await tg.start({ botToken: env.get('TG_MAIN_BOT_TOKEN') })
    const tgLogger = await this.App.container.make('tg:logger')
    await tgLogger.info(`Logged in Telegram as '${self.displayName}'`)
  }

  /**
   * The process has been started
   */
  async ready() {
    const { dp } = await this.App.container.make('tg')
    dp.onNewMessage(filters.document, handleTGMessage)
    dp.onNewMessage(filters.video, handleTGMessage)
  }

  /**
   * Preparing to shut down the app
   */
  async shutdown() {
    const { tg, dp } = await this.App.container.make('tg')
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
  const meta = parseMediaText(text)
  if (!meta) return logger.error(`Failed to parse media info: ${text}`)
  if (meta.type === 'movie') return handleMovie(meta, ctx)
  if (meta.type === 'show') return handleTV(meta, ctx)
}

const handleMovie = async (
  meta: ParsedMovieText,
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
  const trakt = await app.container.make('trakt')
  const traktMovie = await trakt.movies.get(meta.imdb)

  const movieExists = await Movie.query()
    .where('id', '=', traktMovie.ids.slug)
    .orWhere('trakt', '=', traktMovie.ids.trakt)
    .if(traktMovie.ids.imdb, (q) => q.orWhere('trakt', '=', traktMovie.ids.imdb!))
    .if(traktMovie.ids.tmdb, (q) => q.orWhere('trakt', '=', traktMovie.ids.tmdb!))
    .first()

  if (movieExists) return logger.info(`Movie already exists: ${traktMovie.title}`)
  const movie = await Movie.create({
    id: traktMovie.ids.slug,
    title: traktMovie.title,
    trakt: traktMovie.ids.trakt,
    tmdb: traktMovie.ids.tmdb,
    year: traktMovie.year,
    imdb: traktMovie.ids.imdb,
    metadata: { size: media.fileSize!, mimeType: media.mimeType },
    tgMetadata: { fileId: media.fileId, fileLink: link },
  })

  // check if movie has collection
  const traktMovieLists = await trakt.movies.lists({ id: traktMovie.ids.trakt, type: 'official' })

  if (traktMovieLists.length) {
    const movieCollection = traktMovieLists[0]
    const collection = await Collection.query()
      .where('trakt', '=', movieCollection.ids.trakt)
      .orWhere('id', '=', movieCollection.ids.slug)
      .first()
    movie.collectionId = collection?.id

    if (!collection) {
      const newCollection = await Collection.create({
        id: movieCollection.ids.slug,
        name: movieCollection.name,
        trakt: movieCollection.ids.trakt,
      })
      movie.collectionId = newCollection.id
    }
  }

  // save images

  await movie.save()
  return logger.info(`Movie ${movie.title}:${movie.imdb} added`)
}

const handleTV = async (
  meta: ParsedShowText,
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
  const trakt = await app.container.make('trakt')
  const traktShow = await trakt.shows.get(meta.imdb)
  if (!traktShow) return logger.error(meta, `No results found`)

  // tv checks
  let tv = await TV.query()
    .where('id', '=', traktShow.ids.slug)
    .orWhere('trakt', '=', traktShow.ids.trakt)
    .if(traktShow.ids.tvdb, (q) => q.orWhere('tvdb', '=', traktShow.ids.tvdb!))
    .if(traktShow.ids.imdb, (q) => q.orWhere('imdb', '=', traktShow.ids.imdb!))
    .first()
  if (tv) logger.info(`TV ${tv.title} already exists`)
  if (!tv) {
    tv = await TV.create({
      id: traktShow.ids.slug,
      title: traktShow.title,
      year: traktShow.year,
      trakt: traktShow.ids.trakt,
      tmdb: traktShow.ids.tmdb,
      tvdb: traktShow.ids.tvdb,
      imdb: traktShow.ids.imdb,
    })
    await tv.save()
  }

  // season checks
  const traktSeason = await trakt.shows.season(tv.id, meta.season)
  let season = await Season.query()
    .where('number', '=', traktSeason.number)
    .andWhere('trakt', '=', traktSeason.ids.trakt)
    .first()
  if (season) logger.info(`TV ${tv.title} Season ${season.number} already exists`)
  if (!season) {
    season = await tv.related('seasons').create({
      number: traktSeason.number,
      trakt: traktSeason.ids.trakt,
      tvdb: traktSeason.ids.tvdb,
      tmdb: traktSeason.ids.tmdb,
    })
    await season.save()
  }

  // episode checks
  const traktEpisode = await trakt.shows.episode(traktShow.ids.slug, season.number, meta.episode)
  const episodeExists = await Episode.query()
    .where('season', '=', traktEpisode.season)
    .andWhere('episode', '=', traktEpisode.number)
    .andWhere('trakt', '=', traktEpisode.ids.trakt)
    .first()

  if (episodeExists)
    return logger.info(
      `TV ${tv.title} Season ${season.number} Episode ${episodeExists.number} already exists`
    )

  const episode = await season.related('episodes').create({
    number: traktEpisode.number,
    season: traktEpisode.season,
    imdb: traktEpisode.ids.imdb,
    tmdb: traktEpisode.ids.tmdb,
    tvdb: traktEpisode.ids.tvdb,
    trakt: traktEpisode.ids.trakt,
    title: traktEpisode.title,
    metadata: {
      mimeType: media.mimeType,
      size: media.fileSize!,
    },
    tgMetadata: { fileId: media.fileId, fileLink: link },
  })
  await episode.save()

  return logger.info(`TV ${tv.title} Season ${season.number} Episode ${episode.number} added`)
}
