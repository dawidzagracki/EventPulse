import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import type { AgendaItemDto, BrandingDto, PageBlock, PageContentDoc, SeoDto } from '../../types/api'
import { RenderBlock, type BlockContext } from '../content/EventBlocks'
import { ensureGoogleFont } from '../content/fonts'
import { Logo } from '../../components/Logo'
import { assetUrl } from '../../lib/api'

interface PublishedPage {
  content: PageContentDoc
  branding: BrandingDto
  seo: SeoDto
  version: number
}

interface PublicEvent {
  id: string
  name: string
  slug: string
  startsAt: string
  endsAt: string
  location: string | null
  defaultLanguage: string
  status: number
}

interface PublicPhoto {
  id: string
  fileName: string
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

function usePublic<T>(key: string, eventId: string, path: string, enabled = true) {
  return useQuery({
    queryKey: [key, eventId],
    queryFn: async () => (await axios.get<T>(`${baseURL}/api/public/events/${eventId}${path}`)).data,
    enabled,
    retry: false,
  })
}

function ScopedStyles({ blocks }: { blocks: PageBlock[] }) {
  const rules = blocks
    .map((b) => {
      const css = (b.styles?.customCSS as string | undefined) ?? ''
      return css ? `#block-${b.id} { ${css} }` : ''
    })
    .filter(Boolean)
    .join('\n')
  if (!rules) return null
  return <style>{rules}</style>
}

export function PublicEventPage() {
  const { eventId: paramEventId, slug } = useParams()
  const { t, i18n } = useTranslation()
  const lang: 'pl' | 'en' = (i18n.resolvedLanguage ?? 'pl') === 'en' ? 'en' : 'pl'

  // Friendly-URL mode: /public/{slug} resolves to the event id, then the id-based
  // endpoints feed the rest of the page. GUID mode (/public/events/{id}) skips this.
  const slugMode = !!slug && !paramEventId
  const slugResolve = useQuery({
    queryKey: ['public-slug', slug ?? ''],
    queryFn: async () => (await axios.get<PublicEvent>(`${baseURL}/api/public/by-slug/${slug}`)).data,
    enabled: slugMode,
    retry: false,
  })
  const eventId = paramEventId || slugResolve.data?.id || ''

  const page = usePublic<PublishedPage>('public-page', eventId, '/page', !!eventId)
  const event = usePublic<PublicEvent>('public-event', eventId, '', !!eventId)
  const agenda = usePublic<AgendaItemDto[]>('public-agenda', eventId, '/agenda', !!event.data)
  const gallery = usePublic<PublicPhoto[]>('public-gallery', eventId, '/gallery', !!event.data)
  const contests = usePublic<{ id: string; name: string; mode: number }[]>('public-contests', eventId, '/contests', !!event.data)
  const quizzes = usePublic<{ id: string; title: string }[]>('public-quizzes', eventId, '/quizzes', !!event.data)

  useEffect(() => {
    if (page.data?.seo.title) document.title = page.data.seo.title
  }, [page.data])

  // Load the brand web font for the published page.
  useEffect(() => {
    ensureGoogleFont(document, page.data?.branding.fontFamily)
  }, [page.data?.branding.fontFamily])

  // Start the public page in the event's default language (once). After that the
  // visitor's toggle choice sticks (i18n is reactive, so blocks re-render on change).
  const initialLangSet = useRef(false)
  useEffect(() => {
    const def = event.data?.defaultLanguage
    if (!initialLangSet.current && (def === 'pl' || def === 'en')) {
      initialLangSet.current = true
      if (i18n.resolvedLanguage !== def) void i18n.changeLanguage(def)
    }
  }, [event.data?.defaultLanguage, i18n])

  // Page-scoped light theme: override the body's dark gradient for the public landing only.
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#fbfbfd'
    document.body.style.color = '#0f172a'
    return () => {
      document.body.style.background = prev
      document.body.style.color = ''
    }
  }, [])

  const blocks = useMemo(
    () =>
      (page.data?.content.blocks ?? [])
        .filter((b) => b.visible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [page.data],
  )

  if (slugMode && slugResolve.isLoading)
    return <p className="p-8 text-slate-500">{t('common.loading')}</p>

  if (slugMode && (slugResolve.isError || !slugResolve.data)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8 text-slate-900">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold">{t('public.notPublished')}</h1>
          <p className="mt-2 text-slate-500">{t('public.notPublishedHint')}</p>
        </div>
      </div>
    )
  }

  if (page.isLoading || (slugMode && !eventId))
    return <p className="p-8 text-slate-500">{t('common.loading')}</p>

  if (page.isError || !page.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-8 text-slate-900">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold">{t('public.notPublished')}</h1>
          <p className="mt-2 text-slate-500">{t('public.notPublishedHint')}</p>
        </div>
      </div>
    )
  }

  const ctx: BlockContext = {
    eventId,
    branding: page.data.branding,
    lang,
    agenda: agenda.data ?? [],
    galleryUrls: (gallery.data ?? []).map((p) => `${baseURL}/api/public/events/${eventId}/gallery/${p.id}/file`),
    contests: contests.data ?? [],
    quizzes: quizzes.data ?? [],
    startsAt: event.data?.startsAt,
  }

  // Build dynamic anchor links. A block is included when:
  //  - it's visible
  //  - settings.navShow === true (default true for sectional blocks,
  //    default false for hero/spacer — the editor exposes a toggle)
  //  - it has SOMETHING to label it (settings.navLabel override, else title,
  //    else falls back to a sensible block-type label)
  const navItems = blocks
    .filter((b) => b.visible !== false && b.type !== 'spacer')
    .map((b) => {
      const settings = (b.settings ?? {}) as Record<string, unknown>
      const defaultInNav = b.type !== 'hero'
      const inNav = settings.navShow === undefined ? defaultInNav : settings.navShow === true
      if (!inNav) return null
      const labelOverride = (settings.navLabel as string | undefined)?.trim()
      const titleFromContent = (b.content?.[lang]?.title ?? b.content?.pl?.title ?? '').trim()
      const fallback = blockTypeFallbackLabel(b.type, lang)
      const label = labelOverride || titleFromContent || fallback
      if (!label) return null
      return { id: b.id, label }
    })
    .filter((x): x is { id: string; label: string } => x !== null)

  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        fontFamily: page.data.branding.fontFamily,
        background: page.data.branding.backgroundColor ?? '#fbfbfd',
      }}
    >
      <ScopedStyles blocks={blocks} />
      <GlassNav
        logoUrl={page.data.branding.logoUrl}
        eventName={event.data?.name ?? null}
        navItems={navItems}
        lang={lang}
        onLangChange={(l) => i18n.changeLanguage(l)}
      />

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
        {blocks.length === 0 ? (
          <p className="text-center text-slate-400">{t('public.empty')}</p>
        ) : (
          blocks.map((b, i) => (
            <RevealOnScroll key={b.id} delayMs={Math.min(i * 80, 240)}>
              <RenderBlock block={b} ctx={ctx} />
            </RevealOnScroll>
          ))
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-12 pt-4 text-center text-xs text-slate-400">
        Powered by EventPulse
      </footer>
    </div>
  )
}

// Sensible fallback labels for menu items when the block has no title yet.
function blockTypeFallbackLabel(type: string, lang: 'pl' | 'en'): string {
  const map: Record<string, [string, string]> = {
    description: ['O wydarzeniu', 'About'],
    agenda: ['Agenda', 'Agenda'],
    map: ['Lokalizacja', 'Location'],
    gallery: ['Galeria', 'Gallery'],
    countdown: ['Odliczanie', 'Countdown'],
    faq: ['FAQ', 'FAQ'],
    team: ['Zespół', 'Team'],
    video: ['Wideo', 'Video'],
    sponsors: ['Partnerzy', 'Sponsors'],
    cta: ['Dołącz', 'Join'],
    contests: ['Konkursy', 'Contests'],
    quizzes: ['Quizy', 'Quizzes'],
    stats: ['Liczby', 'Stats'],
    features: ['Co Cię czeka', 'Features'],
    testimonial: ['Opinia', 'Testimonial'],
    split: ['Szczegóły', 'Details'],
  }
  const pair = map[type]
  if (!pair) return ''
  return lang === 'en' ? pair[1] : pair[0]
}

/**
 * Sticky glassmorphic navigation bar that auto-builds anchors from the
 * page's blocks. Highlights the active section while scrolling and provides
 * smooth-scroll on click. Compresses on scroll (smaller padding + blur).
 */
function GlassNav({
  logoUrl,
  eventName,
  navItems,
  lang,
  onLangChange,
}: {
  logoUrl: string | null
  eventName: string | null
  navItems: { id: string; label: string }[]
  lang: 'pl' | 'en'
  onLangChange: (l: 'pl' | 'en') => void
}) {
  const [scrolled, setScrolled] = useState(() => (typeof window !== 'undefined' ? window.scrollY > 24 : false))
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Track scroll for the "shrink" effect.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Track which block is most visible.
  useEffect(() => {
    if (navItems.length === 0 || typeof IntersectionObserver === 'undefined') return
    const visibility = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visibility.set(entry.target.id, entry.intersectionRatio)
        }
        let best: string | null = null
        let bestVal = 0
        for (const [id, val] of visibility) {
          if (val > bestVal) {
            bestVal = val
            best = id
          }
        }
        if (bestVal > 0.1) setActiveId(best?.replace(/^block-/, '') ?? null)
      },
      { rootMargin: '-30% 0px -40% 0px', threshold: [0.1, 0.5, 0.9] },
    )
    for (const it of navItems) {
      const node = document.getElementById(`block-${it.id}`)
      if (node) io.observe(node)
    }
    return () => io.disconnect()
  }, [navItems])

  function scrollTo(id: string) {
    const node = document.getElementById(`block-${id}`)
    if (node) {
      const top = node.getBoundingClientRect().top + window.scrollY - 80
      window.scrollTo({ top, behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  return (
    <div
      className={`sticky top-0 z-30 pointer-events-none transition-all duration-300 ${scrolled ? 'pt-3' : 'pt-5'}`}
      // The nav must NOT inherit the brand font — many brand fonts are
      // decorative serifs that look ugly in tiny nav text. Force a clean
      // modern system stack so links are always legible.
      style={{
        fontFamily:
          'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        letterSpacing: '-0.01em',
      }}
    >
      <nav className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-4 px-3 sm:px-4">
        {/* ───────────── Glass capsule ───────────── */}
        <div
          className={`relative flex flex-1 items-center gap-3 overflow-hidden rounded-full transition-all duration-300 ${
            scrolled ? 'px-3 py-1.5' : 'px-4 py-2'
          }`}
          style={{
            // Delicate liquid-glass — much lighter than before.
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.10) 100%)',
            backdropFilter: 'blur(16px) saturate(150%)',
            WebkitBackdropFilter: 'blur(16px) saturate(150%)',
            boxShadow:
              '0 4px 16px -6px rgba(15, 23, 42, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.32), inset 0 0 0 1px rgba(255, 255, 255, 0.10)',
          }}
        >
          {/* Soft specular highlight on top edge */}
          <span
            className="pointer-events-none absolute inset-x-8 top-0 h-px rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }}
            aria-hidden
          />

          {/* Logo + name */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="relative flex shrink-0 items-center gap-2.5 rounded-full outline-none"
          >
            {logoUrl ? (
              <img src={assetUrl(logoUrl) ?? undefined} alt="" className={`w-auto drop-shadow-sm transition-all ${scrolled ? 'h-7' : 'h-9'}`} />
            ) : (
              <Logo size={scrolled ? 28 : 34} />
            )}
            {eventName && (
              <span
                className={`hidden font-semibold tracking-tight text-slate-900/85 sm:inline ${scrolled ? 'text-sm' : 'text-[15px]'}`}
              >
                {eventName}
              </span>
            )}
          </button>

          {/* Divider */}
          {navItems.length > 0 && (
            <span className="hidden h-5 w-px bg-gradient-to-b from-transparent via-slate-900/15 to-transparent md:block" aria-hidden />
          )}

          {/* Anchor links (desktop) */}
          <div className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
            {navItems.map((it) => {
              const isActive = activeId === it.id
              return (
                <button
                  key={it.id}
                  onClick={() => scrollTo(it.id)}
                  className={`relative rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
                    isActive ? 'text-slate-900' : 'text-slate-700/85 hover:text-slate-900'
                  }`}
                >
                  <span className="relative">{it.label}</span>
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-0 -z-10 rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.35)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Language switch — delicate inner pill */}
          <div
            className="relative ml-auto inline-flex shrink-0 overflow-hidden rounded-full text-[11px]"
            style={{
              background: 'rgba(255,255,255,0.14)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)',
            }}
          >
            {(['pl', 'en'] as const).map((lng) => (
              <button
                key={lng}
                onClick={() => onLangChange(lng)}
                className={`px-2.5 py-1 uppercase tracking-wide transition ${
                  lang === lng ? 'bg-slate-900/85 text-white' : 'text-slate-700/85 hover:text-slate-900'
                }`}
              >
                {lng}
              </button>
            ))}
          </div>

          {/* Mobile menu trigger */}
          {navItems.length > 0 && (
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="relative ml-1 rounded-full p-1.5 text-slate-700 md:hidden"
              style={{
                background: 'rgba(255,255,255,0.14)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
              aria-label="Menu"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                <path d={mobileOpen ? 'M6 6l12 12M18 6L6 18' : 'M3 6h18M3 12h18M3 18h18'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </nav>

      {/* Mobile drawer — same glass treatment */}
      {mobileOpen && navItems.length > 0 && (
        <div className="pointer-events-auto mx-auto mt-2 max-w-5xl px-3 sm:px-4 md:hidden">
          <div
            className="relative overflow-hidden rounded-3xl p-2"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)',
              backdropFilter: 'blur(16px) saturate(150%)',
              WebkitBackdropFilter: 'blur(16px) saturate(150%)',
              boxShadow: '0 6px 20px -8px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255,255,255,0.32), inset 0 0 0 1px rgba(255,255,255,0.10)',
            }}
          >
            <span
              className="pointer-events-none absolute inset-x-8 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }}
              aria-hidden
            />
            {navItems.map((it) => {
              const isActive = activeId === it.id
              return (
                <button
                  key={it.id}
                  onClick={() => scrollTo(it.id)}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                    isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <span>{it.label}</span>
                  <span className="text-xs opacity-50">→</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Reveals its child with a CSS fade+slide once it enters the viewport.
 * Uses IntersectionObserver; once revealed it stays visible (one-shot).
 */
function RevealOnScroll({ children, delayMs = 0 }: { children: React.ReactNode; delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  // Default to revealed when IO is unavailable (SSR / very old browsers) so
  // content is never invisible.
  const [revealed, setRevealed] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (revealed) return
    const node = ref.current
    if (!node) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true)
            io.disconnect()
            break
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [revealed])

  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${revealed ? 'reveal-in' : ''}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
