import { TMDB } from 'tmdb-ts'

const tmdb = new TMDB(process.env.TMDB_API_KEY!)

const tmdbMovie = await tmdb.tvShows.details(1399, ['videos', 'external_ids', 'images'])

console.log(JSON.stringify(tmdbMovie, null, 2))
