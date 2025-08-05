import createFetchClient from 'openapi-fetch'
import createClient from 'openapi-react-query'

import type { paths } from '@/lib/api/v1'

export const apiClient = createFetchClient<paths>({
  baseUrl: `${import.meta.env.VITE_BACKEND_URL}/api`,
})

export const apiQuery = createClient(apiClient)
