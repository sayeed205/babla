import { useEffect } from 'react'

import { useAuthStore } from '@/features/auth/stores/auth-store.ts'

export default function useAuth() {
  const { initializeAuth, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const savedToken = localStorage.getItem('babla-auth-store')
    if (savedToken) {
      initializeAuth()
    }
  }, [initializeAuth])

  return { isAuthenticated }
}
