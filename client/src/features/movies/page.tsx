import { apiQuery } from '@/lib/api-client.ts'

export default function MoviesPage() {
  const { data } = apiQuery.useQuery('get', '/movies', {
    params: {
      query: {},
    },
  })

  return (
    <>
      <div className="">
        <h3>Movies</h3>
        <p>Get all movies</p>
        <p>{JSON.stringify(data)}</p>
      </div>
    </>
  )
}
