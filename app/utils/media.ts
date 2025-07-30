import mediaInfoFactory from 'mediainfo.js'
import { Image } from 'tmdb-ts'

import type { MediaMeta } from '#types/media'
import app from '@adonisjs/core/services/app'

export type TGMovieCaption = {
  title: string
  year: number
  type: 'movie'
}

export type TGShowsCaption = {
  title: string
  year: number
  type: 'tv'
  season: number
  episode: number
}

export type TGCaption = TGMovieCaption | TGShowsCaption

const MEDIA_REGEX = /^(.*?)\s+(\d{4})(?:\s+[Ss](\d{1,3})[Ee](\d{1,4}))?$/i

export function parseMediaInfo(input: string): TGCaption | null {
  const match = input.trim().match(MEDIA_REGEX)
  if (!match) return null

  const [, rawTitle, yearStr, seasonStr, episodeStr] = match
  const title = rawTitle.trim()
  const year = Number(yearStr)

  if (!title || Number.isNaN(year)) return null

  // TV show
  if (seasonStr && episodeStr) {
    const season = Number(seasonStr)
    const episode = Number(episodeStr)

    if (Number.isNaN(season) || Number.isNaN(episode)) return null

    return {
      title,
      year,
      type: 'tv',
      season,
      episode,
    }
  }

  // Movie
  return {
    title,
    year,
    type: 'movie',
  }
}

export function getImage(images: Image[]): string {
  if (!images.length) return ''
  return (
    images.find((image) => {
      if (image.iso_639_1 === 'en' || image.iso_639_1 === 'in') {
        return true
      }
      return true
    })?.file_path || ''
  )
}

export async function getVideoMetadata(
  fileId: string
): Promise<Omit<MediaMeta, 'type' | 'size' | 'ext'>> {
  const { tg } = await app.container.make('tg')

  const mediainfo = await mediaInfoFactory({
    locateFile: () =>
      new URL('node_modules/mediainfo.js/dist/MediaInfoModule.wasm', app.appRoot).pathname,
  })
  const size = 1024 * 1024
  const result = await mediainfo.analyzeData(
    () => size,
    async () =>
      await tg.downloadAsBuffer(fileId, {
        offset: 0,
        limit: size,
      })
  )

  const general = result.media?.track.find((t) => t['@type'] === 'General') || {}
  const video = result.media?.track.find((t) => t['@type'] === 'Video') || {}

  mediainfo.close()

  return {
    bitRate: Number.parseInt(general.OverallBitRate || '0', 10),
    bitDepth: Number.parseInt(video.BitDepth || '0', 10),
    videoCodec: video.Format || video.CodecID || video.CodecIDHint || '',
    frameRate: Number.parseFloat(video.FrameRate || '0'),
  }
}
