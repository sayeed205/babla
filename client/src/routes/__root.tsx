import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'

import type { QueryClient } from '@tanstack/react-query'
import { NavigationProgress } from '@/components/navigation-progress.tsx'
import AuthGuard from '@/components/layout/auth-guard.tsx'
import { Toaster } from '@/components/ui/sonner.tsx'
import NotFoundError from '@/features/not-found-error.tsx'
import GeneralError from '@/features/general-error.tsx'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: () => (
    <>
      <NavigationProgress />
      <AuthGuard>
        <Outlet />
      </AuthGuard>
      <Toaster duration={5000} />
      {import.meta.env.DEV && (
        <>
          <TanStackRouterDevtools />
          <TanStackQueryLayout />
        </>
      )}
    </>
  ),
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})
