import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Default stale time for all queries - can be overridden per query
        staleTime: 5 * 60 * 1000, // 5 minutes default
        // Keep data in cache longer to improve performance
        gcTime: 30 * 60 * 1000, // 30 minutes default
        // Retry failed requests with exponential backoff
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.status >= 400 && error?.status < 500) {
            return false
          }
          // Retry up to 3 times for other errors
          return failureCount < 3
        },
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus for fresh data
        refetchOnWindowFocus: false,
        // Don't refetch on reconnect by default
        refetchOnReconnect: 'always',
      },
    },
  })
  return {
    queryClient,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
