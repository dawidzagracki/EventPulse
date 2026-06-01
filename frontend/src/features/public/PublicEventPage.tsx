import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import type { BrandingDto, PageBlock, PageContentDoc, SeoDto } from '../../types/api'

interface PublishedPage {
  content: PageContentDoc
  branding: BrandingDto
  seo: SeoDto
  version: number
}

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

function usePublic(eventId: string) {
  return useQuery({
    queryKey: ['public-page', eventId],
    queryFn: async () => {
      const res = await axios.get<PublishedPage>(`${baseURL}/api/public/events/${eventId}/page`)
      return res.data
    },
    retry: false,
  })
}

function blockContent(block: PageBlock, lang: 'pl' | 'en') {
  const c = block.content[lang] ?? block.content.pl ?? {}
  return {
    title: c.title ?? '',
    text: c.text ?? '',
  }
}

function BlockView({ block, lang, primary }: { block: PageBlock; lang: 'pl' | 'en'; primary: string }) {
  const { title, text } = blockContent(block, lang)
  const id = `block-${block.id}`

  switch (block.type) {
    case 'hero':
      return (
        <section
          id={id}
          className="rounded-3xl p-12 text-center"
          style={{
            background: `linear-gradient(135deg, ${primary}, transparent), rgba(15, 18, 32, 0.6)`,
          }}
        >
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{title}</h1>
          {text && <p className="mt-3 text-lg text-slate-200/90">{text}</p>}
        </section>
      )
    case 'spacer':
      return <div id={id} className="h-12" />
    case 'cta':
      return (
        <section id={id} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-center">
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          {text && <p className="mt-2 text-slate-300">{text}</p>}
        </section>
      )
    default:
      return (
        <section id={id} className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6">
          <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">{block.type}</p>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          {text && <p className="mt-2 whitespace-pre-wrap text-slate-300">{text}</p>}
        </section>
      )
  }
}

/** Builds a single <style> block with all blocks' customCSS scoped under their id. */
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
  const lang = (i18n.resolvedLanguage ?? 'pl') === 'en' ? 'en' : 'pl'
  const { data, isLoading, isError } = usePublic(eventId)

  useEffect(() => {
    if (data?.seo.title) document.title = data.seo.title
  }, [data])

  if (isLoading) {
    return <p className="p-8 text-slate-500">{t('common.loading')}</p>
  }
  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-white">{t('public.notPublished')}</h1>
          <p className="mt-2 text-slate-400">{t('public.notPublishedHint')}</p>
        </div>
      </div>
    )
  }

  const blocks = (data.content.blocks ?? [])
    .filter((b) => b.visible !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <div
      className="min-h-screen"
      style={
        {
          fontFamily: data.branding.fontFamily,
          ['--brand-primary' as string]: data.branding.primaryColor,
          ['--brand-accent' as string]: data.branding.accentColor,
          background: data.branding.backgroundColor ?? undefined,
        } as React.CSSProperties
      }
    >
      <ScopedStyles blocks={blocks} />
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          {data.branding.logoUrl ? (
            <img src={data.branding.logoUrl} alt="" className="h-9 w-auto" />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: data.branding.primaryColor }}
            >
              EP
            </div>
          )}
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
      <main className="mx-auto max-w-4xl space-y-5 px-6 pb-16">
        {blocks.length === 0 ? (
          <p className="text-slate-500">{t('public.empty')}</p>
        ) : (
          blocks.map((b) => <BlockView key={b.id} block={b} lang={lang} primary={data.branding.primaryColor} />)
        )}
      </main>
    </div>
  )
}
