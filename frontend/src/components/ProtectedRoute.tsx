import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getGuestReturnPath } from '../lib/guestEvent'

type Principal = 'Agency' | 'Client' | 'Participant' | 'Operator'

export function ProtectedRoute({ children, allow }: { children: ReactNode; allow?: Principal[] }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const principalType = useAuthStore((s) => s.principalType)
  const eventId = useAuthStore((s) => s.eventId)

  if (!accessToken) {
    // A guest whose session expired must land on their event's re-entry page, not
    // the admin login they can't use. Admin/operator areas still go to /login.
    const guestArea = allow?.length === 1 && allow[0] === 'Participant'
    return <Navigate to={guestArea ? getGuestReturnPath() : '/login'} replace />
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
