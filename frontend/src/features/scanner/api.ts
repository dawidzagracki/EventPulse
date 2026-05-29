import { api } from '../../lib/api'
import { allScans, removeScan } from '../../lib/scanQueue'
import type { BatchScanResult } from '../../types/api'

/**
 * Sends all queued scans for an event to the idempotent batch endpoint and clears the ones the
 * server resolved. On a network error nothing is removed, so the queue survives until back online.
 */
export async function flushQueue(eventId: string): Promise<BatchScanResult | null> {
  const scans = (await allScans()).filter((s) => s.eventId === eventId)
  if (scans.length === 0) {
    return null
  }

  const { data } = await api.post<BatchScanResult>(`/api/events/${eventId}/scans/batch`, {
    items: scans.map((s) => ({
      clientId: s.clientId,
      participantToken: s.participantToken,
      kind: s.kind,
      occurredAt: s.occurredAt,
      stationCode: null,
      online: s.online,
    })),
  })

  for (const s of scans) {
    await removeScan(s.clientId)
  }

  return data
}

const GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

/** Accepts a raw token or a participant link and extracts the GUID token. */
export function extractToken(text: string): string | null {
  const match = text.trim().match(GUID)
  return match ? match[0] : null
}
