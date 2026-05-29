import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const authenticated = useAuthStore((s) => Boolean(s.accessToken))
  if (!authenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
