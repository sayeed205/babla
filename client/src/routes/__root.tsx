import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'

import AuthGuard from '@/components/layout/auth-guard.tsx'
import { NavigationProgress } from '@/components/navigation-progress.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import GeneralError from '@/features/general-error.tsx'
import { MediaPlayerOverlay } from '@/features/media-player/components'
import { MediaPlayerProvider } from '@/features/media-player/providers'
import NotFoundError from '@/features/not-found-error.tsx'
import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <MediaPlayerProvider>
      <NavigationProgress />
      <AuthGuard>
        <Outlet />
      </AuthGuard>
      <MediaPlayerOverlay />
      <Toaster duration={5000} />
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools />
          <TanStackQueryLayout />
        </>
      )}
    </MediaPlayerProvider>
  ),
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
