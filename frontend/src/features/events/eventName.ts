/**
 * Beautifies auto-generated event names like "Event 8c824327dcc1435eadf735aa9c43f4b8"
 * into "Event #8c8243". Real names are returned unchanged.
 *
 * Returns both the short label to display and the full original (use it as `title=`
 * tooltip so the operator can still see the raw value on hover).
 */
export function prettifyEventName(name: string | null | undefined): { display: string; full: string } {
  const safe = name ?? ''
  const m = safe.match(/^(Event\s+)([a-f0-9]{16,})$/i)
  if (m) {
    return { display: `${m[1].trim()} #${m[2].slice(0, 6)}`, full: safe }
  }
  return { display: safe, full: safe }
}
