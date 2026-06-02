import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import type { AgendaItemDto, BrandingDto, PageBlock, PageContentDoc, SeoDto } from '../../types/api'
import { RenderBlock, type BlockContext } from '../content/EventBlocks'

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

/** Per-block scoped customCSS in one <style>. */
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

  const blocks = useMemo(
    () =>
      (page.data?.content.blocks ?? [])
        .filter((b) => b.visible !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [page.data],
  )

  if (page.isLoading) return <p className="p-8 text-slate-500">{t('common.loading')}</p>
  if (page.isError || !page.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white">{t('public.notPublished')}</h1>
          <p className="mt-2 text-slate-400">{t('public.notPublishedHint')}</p>
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
      className="min-h-screen"
      style={{
        fontFamily: page.data.branding.fontFamily,
        background: page.data.branding.backgroundColor ?? undefined,
      }}
    >
      <ScopedStyles blocks={blocks} />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          {page.data.branding.logoUrl ? (
            <img src={page.data.branding.logoUrl} alt="" className="h-9 w-auto" />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: page.data.branding.primaryColor }}
            >
              {(event.data?.name ?? 'EP').slice(0, 2).toUpperCase()}
            </div>
          )}
          {event.data && <span className="text-sm font-medium text-slate-200">{event.data.name}</span>}
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-slate-700/60 bg-slate-900/60 text-[11px]">
          {(['pl', 'en'] as const).map((lng) => (
            <button
              key={lng}
              onClick={() => i18n.changeLanguage(lng)}
              className={`px-2 py-1 uppercase tracking-wide ${
                lang === lng ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lng}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 pb-16">
        {blocks.length === 0 ? (
          <p className="text-center text-slate-500">{t('public.empty')}</p>
        ) : (
          blocks.map((b) => <RenderBlock key={b.id} block={b} ctx={ctx} />)
        )}
      </main>
    </div>
  )
}
