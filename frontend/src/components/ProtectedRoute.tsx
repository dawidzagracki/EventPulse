import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

type Principal = 'Agency' | 'Client' | 'Participant'

export function ProtectedRoute({ children, allow }: { children: ReactNode; allow?: Principal[] }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const principalType = useAuthStore((s) => s.principalType)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (allow && principalType && !allow.includes(principalType)) {
    // Authenticated but in the wrong area — send to the right home.
    return <Navigate to={principalType === 'Participant' ? '/me' : '/'} replace />
  }

  return <>{children}</>
}
