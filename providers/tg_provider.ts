import logger from '@adonisjs/core/services/logger'
import { Dispatcher, filters, MessageContext } from '@mtcute/dispatcher'
import { TelegramClient } from '@mtcute/node'
import mime from 'mime'
import { TMDB } from 'tmdb-ts'

import type { ApplicationService } from '@adonisjs/core/types'
import type { Document, Video } from '@mtcute/node'

import Collection from '#models/collection'
import Image from '#models/image'
import Movie from '#models/movie'
import env from '#start/env'
import { ImageTypeEnum } from '#types/media'
import { getVideoMetadata, parseMediaInfo, TGMovieCaption, TGShowsCaption } from '#utils/media'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    tg: {
      tg: TelegramClient
      dp: Dispatcher<never>
    }
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
      const tg = new TelegramClient({
        apiId: env.get('TG_API_ID'),
        apiHash: env.get('TG_API_HASH'),
        enableErrorReporting: true,
      })
      const dp = Dispatcher.for(tg)
      return { tg, dp }
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
  const imageEntries: {
    type: ImageTypeEnum
    path: string
    collectionId: string
    tableName: string
  }[] = []

  for (const [key, value] of Object.entries(tmdbMovie.images)) {
    const type = key.slice(0, -1) as ImageTypeEnum // e.g., 'backdrops' -> 'backdrop'

    if (!Object.values(ImageTypeEnum).includes(type)) continue

    for (const image of value) {
      imageEntries.push({
        type,
        path: image.file_path,
        collectionId: movie.id,
        tableName: 'movies',
      })
    }
  }

  await Image.createMany(imageEntries)

  await movie.save()
  return logger.info(text, 'Movie added')
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
) => {}
