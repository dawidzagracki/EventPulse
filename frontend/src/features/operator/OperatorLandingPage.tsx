import { useEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface OperatorTokenPayload {
  sub: string
  event_id?: string
  exp: number
}

function decodeJwt(token: string): OperatorTokenPayload | null {
  try {
    const [, payload] = token.split('.')
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

type Validation =
  | { ok: true; token: string; eventId: string }
  | { ok: false; reason: string }

function validate(token: string | undefined): Validation {
  if (!token) return { ok: false, reason: 'Brak tokenu w linku.' }
  const claims = decodeJwt(token)
  if (!claims?.event_id) return { ok: false, reason: 'Link operatora jest nieprawidłowy.' }
  if (claims.exp * 1000 < Date.now()) return { ok: false, reason: 'Link operatora wygasł.' }
  return { ok: true, token, eventId: claims.event_id }
}

/**
 * Lands the QR-station operator straight onto the scanner. The Agency-issued
 * link carries a short-lived JWT in the path; we store it and redirect.
 */
export function OperatorLandingPage() {
  const { token } = useParams<{ token: string }>()
  const setOperator = useAuthStore((s) => s.setOperator)
  const navigate = useNavigate()
  const result = validate(token)

  useEffect(() => {
    if (result.ok) {
      setOperator(result.token, result.eventId, 'Skaner')
      navigate(`/events/${result.eventId}/scanner`, { replace: true })
    }
  }, [result, setOperator, navigate])

  if (!result.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
        <div className="max-w-sm rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <h1 className="text-lg font-bold text-rose-200">Nie można otworzyć skanera</h1>
          <p className="mt-2 text-sm text-rose-100/80">{result.reason}</p>
        </div>
      </div>
    )
  }

  return <Navigate to="/" replace />
}
