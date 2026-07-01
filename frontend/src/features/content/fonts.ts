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

export function googleFontHref(stack?: string | null): string | null {
  const opt = fontOptionByStack(stack)
  return opt.google ? `https://fonts.googleapis.com/css2?family=${opt.google}&display=swap` : null
}

const FONT_LINK_ID = 'ep-google-font'

/** Idempotently attach (or remove) the Google Fonts stylesheet for a stack to a document head. */
export function ensureGoogleFont(doc: Document, stack?: string | null): void {
  const href = googleFontHref(stack)
  const existing = doc.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
  if (!href) {
    existing?.remove()
    return
  }
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
