import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

type Principal = 'Agency' | 'Client' | 'Participant' | 'Operator'

export function ProtectedRoute({ children, allow }: { children: ReactNode; allow?: Principal[] }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const principalType = useAuthStore((s) => s.principalType)
  const eventId = useAuthStore((s) => s.eventId)

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  if (allow && principalType && !allow.includes(principalType)) {
    // Authenticated but in the wrong area — send to the right home.
    const home =
      principalType === 'Participant' ? '/me' :
      principalType === 'Operator' && eventId ? `/events/${eventId}/scanner` :
      '/'
    return <Navigate to={home} replace />
  }

  return <>{children}</>
}
