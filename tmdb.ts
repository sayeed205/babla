import { TMDB } from 'tmdb-ts'

const tmdb = new TMDB(process.env.TMDB_API_KEY!)

const tmdbMovie = await tmdb.movies.details(575265)

console.log(JSON.stringify(tmdbMovie, null, 2))
