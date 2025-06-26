import { Image } from 'tmdb-ts'

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

  if (!title || isNaN(year)) return null

  // TV show
  if (seasonStr && episodeStr) {
    const season = Number(seasonStr)
    const episode = Number(episodeStr)

    if (isNaN(season) || isNaN(episode)) return null

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
