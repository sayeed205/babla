import { TMDB } from 'tmdb-ts'

const tmdb = new TMDB(process.env.TMDB_API_KEY!)

const tmdbSeason = await tmdb.tvSeasons.details({ tvShowID: 37854, seasonNumber: 22 }, [
  'videos',
  'external_ids',
  'images',
])

// const tmdbSeason = await tmdb.tvEpisode.details(
//   { seasonNumber: 1, tvShowID: 1399, episodeNumber: 1 },
//   ['videos', 'external_ids', 'images']
// )

console.log(JSON.stringify(tmdbSeason, null, 2))
