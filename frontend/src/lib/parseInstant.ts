/**
 * Parses a server date/time string to epoch millis, safely across browsers.
 *
 * Safari/iOS reject non-ISO strings like "2026-07-05 18:00:00" (space instead of
 * "T") and return NaN, which silently breaks countdowns and time labels. We
 * normalize the space separator and guard against NaN so callers get a usable
 * number or null (never a crash / stuck timer).
 */
export function parseInstant(value?: string | null): number | null {
  if (!value) return null
  const normalized = value.trim().replace(' ', 'T')
  const ms = new Date(normalized).getTime()
  return Number.isNaN(ms) ? null : ms
}
