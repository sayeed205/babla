import { ParsedMediaText } from '#types/tg'

export function parseMediaText(text: string): ParsedMediaText | null {
  const lower = text.trim().toLowerCase()

  // Match IMDb ID (starts with tt followed by digits)
  const imdbMatch = lower.match(/tt\d{5,}/i)
  if (!imdbMatch) return null
  const imdb = imdbMatch[0]

  if (lower.includes('movie')) {
    return {
      type: 'movie',
      imdb,
    }
  }

  if (lower.includes('show')) {
    // Flexible season & episode match
    const seasonEpisodeShorthand = lower.match(/s(\d+)\s*e(\d+)/i)
    const seasonMatch = lower.match(/season[:\s]*(\d+)/i)
    const episodeMatch = lower.match(/episode[:\s]*(\d+)/i)

    if (seasonEpisodeShorthand) {
      return {
        type: 'show',
        imdb,
        season: Number(seasonEpisodeShorthand[1]),
        episode: Number(seasonEpisodeShorthand[2]),
      }
    }

    if (seasonMatch && episodeMatch) {
      return {
        type: 'show',
        imdb,
        season: Number(seasonMatch[1]),
        episode: Number(episodeMatch[1]),
      }
    }
  }

  return null
}
