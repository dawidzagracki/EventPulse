// Curated font list for the page builder. `branding.fontFamily` stores the CSS
// stack (applied directly as `font-family`); the matching Google Fonts sheet is
// injected on the builder preview and the published public page.

export interface FontOption {
  id: string
  label: string
  stack: string
  /** Google Fonts family spec, e.g. `Inter:wght@400;500;600;700`. Omitted for the system stack. */
  google?: string
}

export const SYSTEM_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', label: 'Systemowa', stack: SYSTEM_FONT },
  { id: 'inter', label: 'Inter', stack: "'Inter', sans-serif", google: 'Inter:wght@400;500;600;700' },
  { id: 'poppins', label: 'Poppins', stack: "'Poppins', sans-serif", google: 'Poppins:wght@400;500;600;700' },
  { id: 'montserrat', label: 'Montserrat', stack: "'Montserrat', sans-serif", google: 'Montserrat:wght@400;500;600;700' },
  { id: 'roboto', label: 'Roboto', stack: "'Roboto', sans-serif", google: 'Roboto:wght@400;500;700' },
  { id: 'lato', label: 'Lato', stack: "'Lato', sans-serif", google: 'Lato:wght@400;700' },
  { id: 'opensans', label: 'Open Sans', stack: "'Open Sans', sans-serif", google: 'Open+Sans:wght@400;600;700' },
  { id: 'playfair', label: 'Playfair Display', stack: "'Playfair Display', serif", google: 'Playfair+Display:wght@400;600;700' },
  { id: 'merriweather', label: 'Merriweather', stack: "'Merriweather', serif", google: 'Merriweather:wght@400;700' },
]

export function fontOptionByStack(stack?: string | null): FontOption {
  if (!stack) return FONT_OPTIONS[0]
  return FONT_OPTIONS.find((f) => f.stack === stack) ?? FONT_OPTIONS[0]
}

/** Resolve a per-text font *id* (as stored on `block.styles["{key}Font"]`) to a CSS stack. */
export function fontStackById(id?: string | null): string | undefined {
  if (!id || id === 'inherit') return undefined
  return FONT_OPTIONS.find((f) => f.id === id)?.stack
}

/** Every distinct CSS stack used by per-text `*Font` overrides across a set of blocks. */
export function blockFontStacks(blocks: Array<{ styles?: Record<string, unknown> | null }>): string[] {
  const out: string[] = []
  for (const b of blocks) {
    const s = b.styles ?? {}
    for (const [k, v] of Object.entries(s)) {
      if (k.endsWith('Font') && typeof v === 'string') {
        const stack = fontStackById(v)
        if (stack) out.push(stack)
      }
    }
  }
  return out
}

export function googleFontHref(stack?: string | null): string | null {
  const opt = fontOptionByStack(stack)
  return opt.google ? `https://fonts.googleapis.com/css2?family=${opt.google}&display=swap` : null
}

const FONT_LINK_ID = 'ep-google-font'

/**
 * Idempotently attach ONE combined Google Fonts stylesheet covering every stack used
 * on the page (the brand font plus any per-text font overrides). Passing an empty /
 * all-system list removes the sheet. Multiple `family=` params are valid for css2.
 */
export function ensureGoogleFonts(doc: Document, stacks: Array<string | null | undefined>): void {
  const families = Array.from(
    new Set(stacks.map((s) => fontOptionByStack(s).google).filter((g): g is string => !!g)),
  )
  const existing = doc.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  if (families.length === 0) {
    existing?.remove()
    return
  }
  const href = `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`
  if (existing) {
    if (existing.href !== href) existing.href = href
    return
  }
  const link = doc.createElement('link')
  link.id = FONT_LINK_ID
  link.rel = 'stylesheet'
  link.href = href
  doc.head.appendChild(link)
}

/** Convenience single-font wrapper around {@link ensureGoogleFonts}. */
export function ensureGoogleFont(doc: Document, stack?: string | null): void {
  ensureGoogleFonts(doc, [stack])
}
