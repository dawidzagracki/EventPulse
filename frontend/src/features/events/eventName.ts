/**
 * Detects auto-generated event names like "Event 8c824327dcc1435eadf735aa9c43f4b8"
 * (the seed/test fallback) and flags them as "auto" so callers can replace the big
 * UUID with a localized "Untitled event" label.
 *
 * Real names are returned as-is with isAuto=false.
 */
export interface PrettyEventName {
  /** Best label to display when not auto (full real name). */
  display: string
  /** The original raw value (use as title= tooltip). */
  full: string
  /** True if the name looks like an auto-generated fallback. */
  isAuto: boolean
  /** Short hash (6 chars) when isAuto — useful as a small "#abc123" subtitle. */
  hash: string | null
}

export function prettifyEventName(name: string | null | undefined): PrettyEventName {
  const safe = name ?? ''
  const m = safe.match(/^(?:Event\s+)?([a-f0-9]{16,})$/i)
  if (m) {
    return { display: safe, full: safe, isAuto: true, hash: m[1].slice(0, 6) }
  }
  return { display: safe, full: safe, isAuto: false, hash: null }
}
