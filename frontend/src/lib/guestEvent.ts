// Remembers which event a guest is attending so we can send them back to the
// right re-entry screen after logout OR after their session expires. Kept in its
// OWN localStorage key (not the auth store, which logout wipes) so it survives both.

const KEY = 'eventpulse-guest-event'

export function rememberGuestEvent(eventId: string): void {
  try {
    localStorage.setItem(KEY, eventId)
  } catch {
    // Storage can be blocked (private mode, quota) — a missing memory just
    // falls back to the landing page below, so this is safe to ignore.
  }
}

/**
 * Where to send a logged-out / expired guest: their event's "email me my link"
 * page when we know the event, otherwise the public landing. Never the admin login.
 */
export function getGuestReturnPath(): string {
  try {
    const id = localStorage.getItem(KEY)
    if (id) return `/e/${id}/login`
  } catch {
    // ignore — fall through to landing
  }
  return '/'
}
