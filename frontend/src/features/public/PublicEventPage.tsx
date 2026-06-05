import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import type { AgendaItemDto, BrandingDto, PageBlock, PageContentDoc, SeoDto } from '../../types/api'
import { RenderBlock, type BlockContext } from '../content/EventBlocks'
import { Logo } from '../../components/Logo'

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
  const { eventId = '' } = useParams()
  const { t, i18n } = useTranslation()
  const lang: 'pl' | 'en' = (i18n.resolvedLanguage ?? 'pl') === 'en' ? 'en' : 'pl'

  const page = usePublic<PublishedPage>('public-page', eventId, '/page')
  const event = usePublic<PublicEvent>('public-event', eventId, '')
  const agenda = usePublic<AgendaItemDto[]>('public-agenda', eventId, '/agenda', !!event.data)
  const gallery = usePublic<PublicPhoto[]>('public-gallery', eventId, '/gallery', !!event.data)

  useEffect(() => {
    if (page.data?.seo.title) document.title = page.data.seo.title
  }, [page.data])

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

  if (page.isLoading)
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
    startsAt: event.data?.startsAt,
  }

  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        fontFamily: page.data.branding.fontFamily,
        background: page.data.branding.backgroundColor ?? '#fbfbfd',
      }}
    >
      <ScopedStyles blocks={blocks} />
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {page.data.branding.logoUrl ? (
              <img src={page.data.branding.logoUrl} alt="" className="h-9 w-auto" />
            ) : (
              <Logo size={36} />
            )}
            {event.data && <span className="text-sm font-semibold text-slate-700">{event.data.name}</span>}
          </div>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white text-[11px] shadow-sm">
            {(['pl', 'en'] as const).map((lng) => (
              <button
                key={lng}
                onClick={() => i18n.changeLanguage(lng)}
                className={`px-2.5 py-1 uppercase tracking-wide ${
                  lang === lng ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {lng}
              </button>
            ))}
          </div>
        </div>
      </header>

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
