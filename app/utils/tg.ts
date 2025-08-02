import { ParsedMediaText } from '#types/tg'

export function parseMediaText(text: string): ParsedMediaText | null {
  const movieRegex = /^movie\s+imdb:([a-zA-Z0-9]+)$/i
  const showRegex = /^show\s+imdb:([a-zA-Z0-9]+)\s+season:(\d+)\s+episode:(\d+)$/i

  const movieMatch = text.match(movieRegex)
  if (movieMatch) {
    return {
      type: 'movie',
      imdb: movieMatch[1],
    }
  }

  const showMatch = text.match(showRegex)
  if (showMatch) {
    return {
      type: 'show',
      imdb: showMatch[1],
      season: Number(showMatch[2]),
      episode: Number(showMatch[3]),
    }
  }

  return null
}
