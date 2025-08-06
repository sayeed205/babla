import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import GeneralError from '@/features/general-error'
import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/movies/$id')({
  component: MovieDetailsPage,
  errorComponent: ({ error }) => {
    // Handle specific movie not found errors
    if (error.message?.includes('404') || error.message?.includes('not found')) {
      return <MovieNotFoundError />
    }
    return <GeneralError />
  },
  beforeLoad: ({ params }) => {
    // Validate that the ID parameter exists and is valid
    const { id } = params
    if (!id || id.trim() === '') {
      throw notFound()
    }
  },
})

function MovieDetailsPage() {
  const { id } = Route.useParams()

  return (
    <>
      <Header fixed>
        <h1 className="text-lg font-semibold">Movie Details</h1>
      </Header>
      <Main>
        <div className="max-w-7xl mx-auto">
          {/* Movie details content will be implemented in subsequent tasks */}
          <div className="py-6">
            <p className="text-muted-foreground">Loading movie details for ID: {id}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Movie details component will be implemented in the next task.
            </p>
          </div>
        </div>
      </Main>
    </>
  )
}

function MovieNotFoundError() {
  const { id } = Route.useParams()
  const navigate = useNavigate()

  return (
    <>
      <Header fixed>
        <h1 className="text-lg font-semibold">Movie Not Found</h1>
      </Header>
      <Main>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Movie Not Found</h1>
            <p className="text-muted-foreground text-center mb-6">
              The movie with ID "{id}" could not be found.
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
              <Button onClick={() => navigate({ to: '/movies' })}>Browse Movies</Button>
            </div>
          </div>
        </div>
      </Main>
    </>
  )
}
