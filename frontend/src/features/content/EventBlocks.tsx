import { useEffect, useState } from 'react'
import type { AgendaItemDto, BrandingDto, PageBlock } from '../../types/api'
import { AgendaItemTypeName } from '../../types/api'

export interface BlockContext {
  eventId: string
  branding: BrandingDto
  lang: 'pl' | 'en'
  /** Live agenda for the event (empty in editor preview unless fetched). */
  agenda?: AgendaItemDto[]
  /** Gallery photo URLs (file paths, already authenticated/public). */
  galleryUrls?: string[]
  /** Event start for countdown blocks. */
  startsAt?: string
}

function pickContent(block: PageBlock, lang: 'pl' | 'en') {
  const c = block.content?.[lang] ?? block.content?.pl ?? {}
  return c as Record<string, string | undefined>
}

function pickSettings(block: PageBlock) {
  return (block.settings ?? {}) as Record<string, unknown>
}

// ---------- Individual block renderers ----------

function HeroBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const bg = c.bgImageUrl
  const primary = ctx.branding.primaryColor
  const accent = ctx.branding.accentColor
  return (
    <section
      id={`block-${block.id}`}
      className="relative overflow-hidden rounded-3xl border border-white/5"
      style={{
        background: bg
          ? `linear-gradient(180deg, rgba(7,8,16,0.55), rgba(7,8,16,0.85)), url('${bg}') center/cover`
          : `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
      }}
    >
      <div className="px-8 py-16 text-center sm:px-12 sm:py-24">
        {c.subtitle && (
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-white/80">{c.subtitle}</p>
        )}
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          {c.title || '—'}
        </h1>
        {(c.dateLabel || c.location) && (
          <p className="mt-5 text-base text-white/85 sm:text-lg">
            {[c.dateLabel, c.location].filter(Boolean).join(' · ')}
          </p>
        )}
        {c.ctaLabel && (
          <a
            href={c.ctaUrl || '#'}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:scale-[1.02]"
          >
            {c.ctaLabel}
          </a>
        )}
      </div>
    </section>
  )
}

function DescriptionBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  return (
    <section id={`block-${block.id}`} className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 sm:p-10">
      {c.title && <h2 className="mb-4 text-3xl font-bold text-white">{c.title}</h2>}
      {c.body && <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-300">{c.body}</p>}
    </section>
  )
}

function AgendaBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const items = ctx.agenda ?? []
  return (
    <section id={`block-${block.id}`} className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 sm:p-10">
      <h2 className="mb-6 text-3xl font-bold text-white">{c.title || (ctx.lang === 'en' ? 'Agenda' : 'Agenda')}</h2>
      {items.length === 0 ? (
        <p className="text-slate-500">{ctx.lang === 'en' ? 'No agenda items yet.' : 'Brak punktów agendy.'}</p>
      ) : (
        <ol className="relative ml-3 space-y-5 border-l border-slate-700/60 pl-6">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span
                className="absolute -left-[33px] top-1.5 h-3 w-3 rounded-full ring-4 ring-slate-900"
                style={{ background: ctx.branding.primaryColor }}
              />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {new Date(item.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {AgendaItemTypeName[item.type]}
              </p>
              <p className="text-lg font-semibold text-white">
                {ctx.lang === 'en' ? item.titleEn : item.titlePl}
              </p>
              {item.locationName && <p className="text-sm text-slate-400">📍 {item.locationName}</p>}
              {item.speakerName && <p className="text-sm text-slate-400">🎤 {item.speakerName}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function MapBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const address = c.address
  const src = address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null
  return (
    <section id={`block-${block.id}`} className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/50">
      <div className="p-8 sm:p-10">
        <h2 className="text-3xl font-bold text-white">{c.title || (ctx.lang === 'en' ? 'Location' : 'Lokalizacja')}</h2>
        {address && <p className="mt-2 text-slate-300">{address}</p>}
      </div>
      {src && (
        <iframe
          src={src}
          className="h-72 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="map"
        />
      )}
    </section>
  )
}

function GalleryBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const photos = ctx.galleryUrls ?? []
  return (
    <section id={`block-${block.id}`} className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 sm:p-10">
      <h2 className="mb-6 text-3xl font-bold text-white">{c.title || (ctx.lang === 'en' ? 'Gallery' : 'Galeria')}</h2>
      {photos.length === 0 ? (
        <p className="text-slate-500">
          {ctx.lang === 'en' ? 'Photos will appear after the event.' : 'Zdjęcia pojawią się po wydarzeniu.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((url, i) => (
            <img key={i} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      )}
    </section>
  )
}

function CountdownBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const target = ctx.startsAt ? new Date(ctx.startsAt).getTime() : null
  const diff = target ? Math.max(0, target - now) : 0
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff / 3_600_000) % 24)
  const minutes = Math.floor((diff / 60_000) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  const cells = [
    { v: days, label: ctx.lang === 'en' ? 'days' : 'dni' },
    { v: hours, label: ctx.lang === 'en' ? 'hours' : 'godz' },
    { v: minutes, label: ctx.lang === 'en' ? 'min' : 'min' },
    { v: seconds, label: ctx.lang === 'en' ? 'sec' : 'sek' },
  ]
  return (
    <section
      id={`block-${block.id}`}
      className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-8 text-center sm:p-12"
    >
      <h2 className="text-2xl font-bold text-white sm:text-3xl">{c.title || (ctx.lang === 'en' ? 'Countdown' : 'Do startu zostało')}</h2>
      <div className="mt-6 grid grid-cols-4 gap-3 sm:gap-4">
        {cells.map((cell, i) => (
          <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-3xl font-bold text-white sm:text-5xl tabular-nums">{String(cell.v).padStart(2, '0')}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{cell.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FaqBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const settings = pickSettings(block)
  const items = (settings.items as { q: string; a: string }[] | undefined) ?? []
  return (
    <section id={`block-${block.id}`} className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 sm:p-10">
      <h2 className="mb-6 text-3xl font-bold text-white">{c.title || 'FAQ'}</h2>
      {items.length === 0 ? (
        <p className="text-slate-500">{ctx.lang === 'en' ? 'No questions yet.' : 'Brak pytań.'}</p>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <details key={i} className="group rounded-xl border border-slate-800 bg-slate-950/40 p-4 open:bg-slate-950/70">
              <summary className="cursor-pointer list-none text-base font-medium text-white">
                {it.q}
                <span className="float-right text-slate-500 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-slate-300">{it.a}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}

function TeamBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const settings = pickSettings(block)
  const members = (settings.members as { name: string; role?: string; avatarUrl?: string }[] | undefined) ?? []
  return (
    <section id={`block-${block.id}`} className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 sm:p-10">
      <h2 className="mb-6 text-3xl font-bold text-white">{c.title || (ctx.lang === 'en' ? 'Team' : 'Zespół')}</h2>
      {members.length === 0 ? (
        <p className="text-slate-500">{ctx.lang === 'en' ? 'Team coming soon.' : 'Zespół wkrótce.'}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {members.map((m, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto h-20 w-20 overflow-hidden rounded-full bg-slate-800">
                {m.avatarUrl && <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <p className="mt-3 font-semibold text-white">{m.name}</p>
              {m.role && <p className="text-sm text-slate-400">{m.role}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function VideoBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const url = c.youtubeUrl
  const id = url?.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1]
  return (
    <section id={`block-${block.id}`} className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/50">
      <div className="p-8 sm:p-10">
        <h2 className="text-3xl font-bold text-white">{c.title || (ctx.lang === 'en' ? 'Video' : 'Wideo')}</h2>
      </div>
      {id ? (
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube.com/embed/${id}`}
          allowFullScreen
          title="video"
        />
      ) : (
        <p className="px-10 pb-10 text-slate-500">{ctx.lang === 'en' ? 'Add a YouTube link.' : 'Dodaj link YouTube.'}</p>
      )}
    </section>
  )
}

function SponsorsBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  const settings = pickSettings(block)
  const logos = (settings.logos as { name: string; logoUrl?: string; url?: string }[] | undefined) ?? []
  return (
    <section id={`block-${block.id}`} className="rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 sm:p-10">
      <h2 className="mb-6 text-center text-2xl font-bold text-white">{c.title || (ctx.lang === 'en' ? 'Partners' : 'Partnerzy')}</h2>
      {logos.length === 0 ? (
        <p className="text-center text-slate-500">{ctx.lang === 'en' ? 'No sponsors yet.' : 'Brak partnerów.'}</p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-80">
          {logos.map((logo, i) => (
            <a key={i} href={logo.url || '#'} className="grayscale transition hover:grayscale-0">
              {logo.logoUrl ? (
                <img src={logo.logoUrl} alt={logo.name} className="h-10 w-auto" />
              ) : (
                <span className="text-slate-300">{logo.name}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function CtaBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pickContent(block, ctx.lang)
  return (
    <section
      id={`block-${block.id}`}
      className="rounded-3xl p-10 text-center sm:p-14"
      style={{ background: `linear-gradient(135deg, ${ctx.branding.primaryColor}, ${ctx.branding.accentColor})` }}
    >
      <h2 className="text-3xl font-bold text-white sm:text-4xl">{c.title || '—'}</h2>
      {c.body && <p className="mt-3 text-lg text-white/90">{c.body}</p>}
      {c.buttonLabel && (
        <a
          href={c.buttonUrl || '#'}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-[1.02]"
        >
          {c.buttonLabel}
        </a>
      )}
    </section>
  )
}

function SpacerBlock({ block }: { block: PageBlock }) {
  const h = ((block.settings?.height as number | undefined) ?? 32)
  return <div id={`block-${block.id}`} style={{ height: h }} />
}

const RENDERERS: Record<string, React.FC<{ block: PageBlock; ctx: BlockContext }>> = {
  hero: HeroBlock,
  description: DescriptionBlock,
  agenda: AgendaBlock,
  map: MapBlock,
  gallery: GalleryBlock,
  countdown: CountdownBlock,
  faq: FaqBlock,
  team: TeamBlock,
  video: VideoBlock,
  sponsors: SponsorsBlock,
  cta: CtaBlock,
  spacer: SpacerBlock,
}

export function RenderBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const Component = RENDERERS[block.type] ?? DescriptionBlock
  return <Component block={block} ctx={ctx} />
}
