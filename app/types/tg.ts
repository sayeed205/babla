export type ParsedMovieText = { type: 'movie'; imdb: string }
export type ParsedShowText = { type: 'show'; imdb: string; season: number; episode: number }
export type ParsedMediaText = ParsedMovieText | ParsedShowText

export type MediaMetadata = {
  mimeType: string
  size: number
  filename: string
}

export type TGMetadata = {
  fileId: string
  fileLink: string
}
