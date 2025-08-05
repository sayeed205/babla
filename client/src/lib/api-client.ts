import createFetchClient, { type Middleware } from 'openapi-fetch'
import createClient from 'openapi-react-query'

import type { paths } from '@/lib/api/v1'
import { storage } from '@/features/auth/lib/auth-utils.ts'

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const stored = storage.get()
    if (!stored) return request
    const { token } = stored
    if (token && !token.token) {
      storage.remove()
    }
    request.headers.set('Authorization', `Bearer ${token.token}`)
    return request
  },
}

export const apiClient = createFetchClient<paths>({
  baseUrl: `${import.meta.env.VITE_BACKEND_URL}/api`,
})

apiClient.use(authMiddleware)

export const apiQuery = createClient(apiClient)
