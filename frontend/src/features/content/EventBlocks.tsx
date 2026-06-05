import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AgendaItemDto, BrandingDto, PageBlock } from '../../types/api'
import { AgendaItemTypeName } from '../../types/api'
import { getBlockStyle } from './blockStyles'
import { ALL_BLOCK_TYPES, BLOCK_SCHEMAS, CATEGORY_META, type BlockCategory } from './blockSchema'

export interface EditMode {
  onTextChange: (blockId: string, key: string, value: string) => void
}

export interface BlockContext {
  eventId: string
  branding: BrandingDto
  lang: 'pl' | 'en'
  agenda?: AgendaItemDto[]
  galleryUrls?: string[]
  startsAt?: string
  /** When set, the block is rendered inside the editor and text becomes contentEditable. */
  edit?: EditMode
}

function pick(block: PageBlock, lang: 'pl' | 'en') {
  return (block.content?.[lang] ?? block.content?.pl ?? {}) as Record<string, string | undefined>
}

function pickSettings(block: PageBlock) {
  return (block.settings ?? {}) as Record<string, unknown>
}

/** Inline-editable text. Renders plain text in public mode, contentEditable in editor mode. */
function E({
  block,
  k,
  ctx,
  placeholder,
  className = '',
}: {
  block: PageBlock
  k: string
  ctx: BlockContext
  placeholder?: string
  className?: string
}) {
  const value = (block.content?.[ctx.lang]?.[k] ?? '') as string
  if (!ctx.edit) {
    return <span className={className}>{value || placeholder || ''}</span>
  }
  return (
    <span
      className={`${className} -mx-1 cursor-text rounded px-1 outline-none transition focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-400/60 hover:bg-indigo-50/40`}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={(e) => {
        const next = e.currentTarget.textContent ?? ''
        if (next !== value) ctx.edit!.onTextChange(block.id, k, next)
      }}
    >
      {value || placeholder || ''}
    </span>
  )
}

// ---------- Block renderers ----------

function HeroBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pick(block, ctx.lang)
  const bg = c.bgImageUrl
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  const accent = ctx.branding.accentColor
  const defaultBg = bg
    ? `linear-gradient(180deg, rgba(15,18,32,0.40), rgba(15,18,32,0.75)), url('${bg}') center/cover`
    : `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
  return (
    <section
      id={`block-${block.id}`}
      className={`relative overflow-hidden rounded-3xl ${stl.className}`}
      style={{ background: defaultBg, ...stl.style }}
    >
      {/* Animated gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(800px 400px at 20% 0%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(700px 400px at 100% 100%, rgba(0,0,0,0.25), transparent 60%)',
        }}
      />
      {/* Decorative grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(rgb(255 255 255) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative px-6 py-24 text-center text-white sm:px-12 sm:py-36">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/95 backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <E block={block} k="subtitle" ctx={ctx} placeholder="NADTYTUŁ" />
        </span>
        <h1 className="mt-7 text-balance text-5xl font-black leading-[1.02] tracking-tight drop-shadow-2xl sm:text-7xl lg:text-8xl">
          <E block={block} k="title" ctx={ctx} placeholder="Tytuł wydarzenia" />
        </h1>
        <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-base text-white/95 sm:text-lg">
          <span className="inline-flex items-center gap-2">
            <span className="text-white/70">📅</span>
            <E block={block} k="dateLabel" ctx={ctx} placeholder="Data" />
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-white/40 sm:inline-block" />
          <span className="inline-flex items-center gap-2">
            <span className="text-white/70">📍</span>
            <E block={block} k="location" ctx={ctx} placeholder="Miejsce" />
          </span>
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="group mt-12 inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-bold tracking-wide text-slate-900 shadow-2xl shadow-black/40 transition hover:scale-[1.03] hover:shadow-white/20"
        >
          <E block={block} k="ctaLabel" ctx={ctx} placeholder="Zarejestruj się" />
          <span className="transition group-hover:translate-x-1">→</span>
        </a>
      </div>
    </section>
  )
}

function DescriptionBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  return (
    <section
      id={`block-${block.id}`}
      className={`relative overflow-hidden rounded-3xl bg-white p-10 shadow-xl shadow-slate-200/40 ring-1 ring-slate-200 sm:p-16 ${stl.className}`}
      style={stl.style}
    >
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <span className="h-1 w-12 rounded-full" style={{ background: primary }} />
          <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: primary }}>
            <E block={block} k="eyebrow" ctx={ctx} placeholder="O wydarzeniu" />
          </p>
        </div>
        <h2 className="mt-4 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl" style={{ color: stl.titleColor ?? '#0f172a' }}>
          <E block={block} k="title" ctx={ctx} placeholder="Tytuł sekcji" />
        </h2>
        <div
          className="mt-7 max-w-3xl whitespace-pre-wrap text-lg leading-relaxed sm:text-xl"
          style={{ color: stl.textColor ?? '#475569' }}
        >
          <E block={block} k="body" ctx={ctx} placeholder="Opisz tu swoje wydarzenie..." />
        </div>
      </div>
    </section>
  )
}

// ---------- New premium blocks ----------

function StatsBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const settings = pickSettings(block)
  const stats = (settings.stats as { value: string; label: string }[] | undefined) ?? []
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  return (
    <section
      id={`block-${block.id}`}
      className={`relative overflow-hidden rounded-3xl p-10 sm:p-16 ${stl.className}`}
      style={{
        background: `linear-gradient(135deg, ${primary} 0%, ${ctx.branding.accentColor} 100%)`,
        ...stl.style,
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(rgb(255 255 255) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <div className="relative mx-auto max-w-5xl text-center text-white">
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          <E block={block} k="title" ctx={ctx} placeholder="W liczbach" />
        </h2>
        {stats.length === 0 ? (
          <p className="mt-6 text-white/70">
            {ctx.lang === 'en' ? 'Add stats in block settings.' : 'Dodaj liczby w ustawieniach bloku.'}
          </p>
        ) : (
          <div className={`mt-12 grid gap-6 ${stats.length === 2 ? 'sm:grid-cols-2' : stats.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
            {stats.map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
                <p className="bg-gradient-to-br from-white to-white/70 bg-clip-text text-5xl font-black tabular-nums tracking-tight text-transparent sm:text-6xl">
                  {s.value}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function FeaturesBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const settings = pickSettings(block)
  const features = (settings.features as { emoji: string; title: string; body: string }[] | undefined) ?? []
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  return (
    <section
      id={`block-${block.id}`}
      className={`rounded-3xl bg-white p-10 shadow-xl shadow-slate-200/40 ring-1 ring-slate-200 sm:p-16 ${stl.className}`}
      style={stl.style}
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <span className="h-1 w-8 rounded-full" style={{ background: primary }} />
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: primary }}>
              <E block={block} k="eyebrow" ctx={ctx} placeholder="Co Cię czeka" />
            </p>
            <span className="h-1 w-8 rounded-full" style={{ background: primary }} />
          </div>
          <h2 className="mt-4 text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl" style={{ color: stl.titleColor ?? '#0f172a' }}>
            <E block={block} k="title" ctx={ctx} placeholder="Najważniejsze elementy" />
          </h2>
        </div>
        {features.length === 0 ? (
          <p className="mt-8 text-center text-slate-500">
            {ctx.lang === 'en' ? 'Add features in block settings.' : 'Dodaj cechy w ustawieniach bloku.'}
          </p>
        ) : (
          <div className={`mt-14 grid gap-6 ${features.length >= 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {features.map((f, i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-7 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/40">
                <div
                  className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-15 blur-2xl transition group-hover:opacity-30"
                  style={{ background: primary }}
                />
                <span
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-3xl shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${primary}, ${ctx.branding.accentColor})` }}
                >
                  {f.emoji || '✨'}
                </span>
                <h3 className="relative mt-5 text-xl font-bold tracking-tight text-slate-900">{f.title}</h3>
                <p className="relative mt-2 leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function TestimonialBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pick(block, ctx.lang)
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  return (
    <section
      id={`block-${block.id}`}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-white p-10 ring-1 ring-slate-200 sm:p-16 ${stl.className}`}
      style={stl.style}
    >
      <div className="mx-auto max-w-3xl text-center">
        <svg viewBox="0 0 32 32" className="mx-auto h-12 w-12 opacity-20" fill="currentColor" style={{ color: primary }} aria-hidden>
          <path d="M0 14C0 6 6 0 14 0v6c-4 0-8 4-8 8h8v18H0V14zm18 0c0-8 6-14 14-14v6c-4 0-8 4-8 8h8v18H18V14z" />
        </svg>
        <blockquote className="mt-6 text-balance text-2xl font-medium leading-snug tracking-tight text-slate-800 sm:text-3xl">
          „<E block={block} k="quote" ctx={ctx} placeholder="Najlepsze wydarzenie roku!" />"
        </blockquote>
        <div className="mt-8 flex items-center justify-center gap-4">
          {c.avatarUrl && (
            <img src={c.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-white shadow-lg" />
          )}
          <div className="text-left">
            <p className="text-base font-semibold text-slate-900">
              <E block={block} k="author" ctx={ctx} placeholder="Jan Kowalski" />
            </p>
            <p className="text-sm" style={{ color: primary }}>
              <E block={block} k="authorRole" ctx={ctx} placeholder="CEO, Firma" />
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function SplitBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pick(block, ctx.lang)
  const settings = pickSettings(block)
  const reverse = settings.imageRight === true
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  return (
    <section
      id={`block-${block.id}`}
      className={`overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/40 ring-1 ring-slate-200 ${stl.className}`}
      style={stl.style}
    >
      <div className={`grid items-center gap-0 lg:grid-cols-2 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        {/* Text side */}
        <div className="p-10 sm:p-16">
          <div className="flex items-center gap-3">
            <span className="h-1 w-10 rounded-full" style={{ background: primary }} />
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: primary }}>
              <E block={block} k="eyebrow" ctx={ctx} placeholder="O wydarzeniu" />
            </p>
          </div>
          <h2 className="mt-4 text-balance text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
            <E block={block} k="title" ctx={ctx} placeholder="Tytuł sekcji" />
          </h2>
          <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed text-slate-600">
            <E block={block} k="body" ctx={ctx} placeholder="Opisz szczegóły..." />
          </p>
          {c.ctaLabel && (
            <a
              href={c.ctaUrl || '#'}
              onClick={(e) => !c.ctaUrl && e.preventDefault()}
              className="group mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold text-white shadow-xl transition hover:scale-[1.02]"
              style={{ background: primary }}
            >
              {c.ctaLabel}
              <span className="transition group-hover:translate-x-1">→</span>
            </a>
          )}
        </div>
        {/* Image side */}
        <div className="relative h-64 lg:h-full lg:min-h-[420px]">
          {c.imageUrl ? (
            <img src={c.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-white/60"
              style={{ background: `linear-gradient(135deg, ${primary}, ${ctx.branding.accentColor})` }}
            >
              <span className="text-6xl opacity-40">🖼</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function AgendaBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const items = ctx.agenda ?? []
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  return (
    <section
      id={`block-${block.id}`}
      className={`rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200 sm:p-14 ${stl.className}`}
      style={stl.style}
    >
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        <E block={block} k="title" ctx={ctx} placeholder="Agenda" />
      </h2>
      {items.length === 0 ? (
        <p className="mt-8 text-slate-500">
          {ctx.lang === 'en'
            ? 'Agenda will be published soon.'
            : 'Agenda zostanie wkrótce opublikowana.'}
        </p>
      ) : (
        <ol className="relative mt-10 space-y-7 border-l-2 border-slate-100 pl-8">
          {items.map((item) => (
            <li key={item.id} className="relative">
              <span
                className="absolute -left-[37px] top-1.5 h-4 w-4 rounded-full ring-4 ring-white"
                style={{ background: primary }}
              />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {new Date(item.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {AgendaItemTypeName[item.type]}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {ctx.lang === 'en' ? item.titleEn : item.titlePl}
              </p>
              {item.locationName && <p className="mt-1 text-sm text-slate-500">📍 {item.locationName}</p>}
              {item.speakerName && <p className="mt-1 text-sm text-slate-500">🎤 {item.speakerName}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function MapBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pick(block, ctx.lang)
  const address = c.address
  const src = address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null
  const stl = getBlockStyle(block)
  return (
    <section
      id={`block-${block.id}`}
      className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 ${stl.className}`}
      style={stl.style}
    >
      <div className="p-10 sm:p-14">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          <E block={block} k="title" ctx={ctx} placeholder="Lokalizacja" />
        </h2>
        {address && <p className="mt-3 text-lg text-slate-600">{address}</p>}
      </div>
      {src && (
        <iframe
          src={src}
          className="h-80 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="map"
        />
      )}
    </section>
  )
}

function GalleryBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const photos = ctx.galleryUrls ?? []
  const stl = getBlockStyle(block)
  return (
    <section
      id={`block-${block.id}`}
      className={`rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200 sm:p-14 ${stl.className}`}
      style={stl.style}
    >
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        <E block={block} k="title" ctx={ctx} placeholder="Galeria" />
      </h2>
      {photos.length === 0 ? (
        <p className="mt-6 text-slate-500">
          {ctx.lang === 'en' ? 'Photos appear after the event.' : 'Zdjęcia pojawią się po wydarzeniu.'}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="aspect-square w-full rounded-xl object-cover ring-1 ring-slate-200"
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CountdownBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
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
    { v: days, l: ctx.lang === 'en' ? 'days' : 'dni' },
    { v: hours, l: ctx.lang === 'en' ? 'hours' : 'godz' },
    { v: minutes, l: 'min' },
    { v: seconds, l: ctx.lang === 'en' ? 'sec' : 'sek' },
  ]
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  return (
    <section
      id={`block-${block.id}`}
      className={`overflow-hidden rounded-3xl p-12 text-center text-white ${stl.className}`}
      style={{
        background: `linear-gradient(135deg, ${primary}, ${ctx.branding.accentColor})`,
        ...stl.style,
      }}
    >
      <h2 className="text-2xl font-bold sm:text-3xl">
        <E block={block} k="title" ctx={ctx} placeholder="Do startu zostało" />
      </h2>
      <div className="mx-auto mt-8 grid max-w-2xl grid-cols-4 gap-3 sm:gap-5">
        {cells.map((cell, i) => (
          <div key={i} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm sm:p-6">
            <p className="text-3xl font-black tabular-nums sm:text-5xl">{String(cell.v).padStart(2, '0')}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">{cell.l}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function FaqBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const settings = pickSettings(block)
  const items = (settings.items as { q: string; a: string }[] | undefined) ?? []
  const stl = getBlockStyle(block)
  return (
    <section
      id={`block-${block.id}`}
      className={`rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200 sm:p-14 ${stl.className}`}
      style={stl.style}
    >
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        <E block={block} k="title" ctx={ctx} placeholder="Najczęstsze pytania" />
      </h2>
      {items.length === 0 ? (
        <p className="mt-6 text-slate-500">
          {ctx.lang === 'en' ? 'No questions yet.' : 'Brak pytań — dodaj je w ustawieniach bloku.'}
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((it, i) => (
            <details
              key={i}
              className="group rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200 open:bg-white open:shadow-sm"
            >
              <summary className="cursor-pointer list-none text-base font-semibold text-slate-900">
                {it.q}
                <span className="float-right text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-slate-600">{it.a}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}

function TeamBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const settings = pickSettings(block)
  const members = (settings.members as { name: string; role?: string; avatarUrl?: string }[] | undefined) ?? []
  const stl = getBlockStyle(block)
  return (
    <section
      id={`block-${block.id}`}
      className={`rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200 sm:p-14 ${stl.className}`}
      style={stl.style}
    >
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        <E block={block} k="title" ctx={ctx} placeholder="Zespół" />
      </h2>
      {members.length === 0 ? (
        <p className="mt-6 text-slate-500">{ctx.lang === 'en' ? 'Team coming soon.' : 'Zespół wkrótce.'}</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4">
          {members.map((m, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                {m.avatarUrl && <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <p className="mt-4 font-semibold text-slate-900">{m.name}</p>
              {m.role && <p className="text-sm text-slate-500">{m.role}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function VideoBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const c = pick(block, ctx.lang)
  const url = c.youtubeUrl
  const id = url?.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/)?.[1]
  const stl = getBlockStyle(block)
  return (
    <section
      id={`block-${block.id}`}
      className={`overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 ${stl.className}`}
      style={stl.style}
    >
      <div className="p-10 sm:p-14">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          <E block={block} k="title" ctx={ctx} placeholder="Wideo" />
        </h2>
      </div>
      {id ? (
        <iframe
          className="aspect-video w-full"
          src={`https://www.youtube.com/embed/${id}`}
          allowFullScreen
          title="video"
        />
      ) : (
        <p className="px-10 pb-10 text-slate-500">
          {ctx.lang === 'en' ? 'Add a YouTube link in block settings.' : 'Dodaj link YouTube w ustawieniach bloku.'}
        </p>
      )}
    </section>
  )
}

function SponsorsBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const settings = pickSettings(block)
  const logos = (settings.logos as { name: string; logoUrl?: string; url?: string }[] | undefined) ?? []
  const stl = getBlockStyle(block)
  return (
    <section
      id={`block-${block.id}`}
      className={`rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200 sm:p-14 ${stl.className}`}
      style={stl.style}
    >
      <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        <E block={block} k="title" ctx={ctx} placeholder="Partnerzy" />
      </h2>
      {logos.length === 0 ? (
        <p className="mt-6 text-center text-slate-500">
          {ctx.lang === 'en' ? 'Add sponsors in block settings.' : 'Dodaj partnerów w ustawieniach bloku.'}
        </p>
      ) : (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-12 opacity-80">
          {logos.map((logo, i) => (
            <a key={i} href={logo.url || '#'} className="grayscale transition hover:grayscale-0">
              {logo.logoUrl ? (
                <img src={logo.logoUrl} alt={logo.name} className="h-12 w-auto" />
              ) : (
                <span className="text-slate-700">{logo.name}</span>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

function CtaBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const stl = getBlockStyle(block)
  const primary = stl.accentColor ?? ctx.branding.primaryColor
  return (
    <section
      id={`block-${block.id}`}
      className={`overflow-hidden rounded-3xl p-12 text-center text-white sm:p-16 ${stl.className}`}
      style={{
        background: `linear-gradient(135deg, ${primary}, ${ctx.branding.accentColor})`,
        ...stl.style,
      }}
    >
      <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">
        <E block={block} k="title" ctx={ctx} placeholder="Dołącz do nas" />
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
        <E block={block} k="body" ctx={ctx} placeholder="Krótki tekst zachęcający" />
      </p>
      <span className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 shadow-2xl shadow-black/30 transition hover:scale-[1.02]">
        <E block={block} k="buttonLabel" ctx={ctx} placeholder="Zarejestruj się" />
      </span>
    </section>
  )
}

function SpacerBlock({ block }: { block: PageBlock }) {
  const h = (block.settings?.height as number | undefined) ?? 48
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
  stats: StatsBlock,
  features: FeaturesBlock,
  testimonial: TestimonialBlock,
  split: SplitBlock,
}

export function RenderBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const Component = RENDERERS[block.type] ?? DescriptionBlock
  return <Component block={block} ctx={ctx} />
}

/** Wraps a block in the editor canvas — adds selection ring, hover toolbar, drop-zones around it. */
export function EditorFrame({
  block,
  index,
  totalBlocks,
  selected,
  onSelect,
  onMove,
  onDelete,
  onToggleVisible,
  children,
}: {
  block: PageBlock
  index: number
  totalBlocks: number
  selected: boolean
  onSelect: () => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
  onToggleVisible: () => void
  children: ReactNode
}) {
  return (
    <div
      className={`group relative rounded-3xl transition ${
        selected ? 'outline outline-2 outline-indigo-500/70 outline-offset-2' : ''
      } ${block.visible === false ? 'opacity-50' : ''}`}
      onClick={onSelect}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/x-block-index', String(index))
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      {children}
      <div className="pointer-events-none absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onMove(-1)
          }}
          disabled={index === 0}
          className="pointer-events-auto rounded-md bg-slate-900/90 px-2 py-1 text-xs text-white shadow-lg ring-1 ring-white/10 hover:bg-slate-900 disabled:opacity-40"
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onMove(1)
          }}
          disabled={index === totalBlocks - 1}
          className="pointer-events-auto rounded-md bg-slate-900/90 px-2 py-1 text-xs text-white shadow-lg ring-1 ring-white/10 hover:bg-slate-900 disabled:opacity-40"
          aria-label="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleVisible()
          }}
          className="pointer-events-auto rounded-md bg-slate-900/90 px-2 py-1 text-xs text-white shadow-lg ring-1 ring-white/10 hover:bg-slate-900"
          aria-label="Toggle visibility"
        >
          {block.visible === false ? '🚫' : '👁'}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="pointer-events-auto rounded-md bg-rose-600/95 px-2 py-1 text-xs text-white shadow-lg ring-1 ring-white/10 hover:bg-rose-600"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/**
 * Drop zone between blocks. On hover it expands and reveals a centered "+"
 * button that pops open a mini block picker — much faster than dragging from
 * the side palette every time (Elementor-style inline insert).
 *
 * During an active drag anywhere on the document, ALL drop zones light up
 * (light indigo line) so the target is obvious. Auto-scroll near the
 * viewport edges so users can drop below the fold without losing the drag.
 */
export function DropZone({
  index,
  onReorder,
  onInsertNew,
}: {
  index: number
  onReorder: (from: number, to: number) => void
  onInsertNew: (type: string, at: number) => void
}) {
  const [dragActive, setDragActive] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // True whenever *some* block drag is in progress anywhere on the page so
  // we can preview the drop zone as a faint line and make it easier to find.
  const [globalDragging, setGlobalDragging] = useState(false)

  useEffect(() => {
    function onStart(e: DragEvent) {
      const types = e.dataTransfer?.types
      if (!types) return
      if (types.includes('text/x-block-index') || types.includes('text/x-block-type')) {
        setGlobalDragging(true)
      }
    }
    function onEnd() {
      setGlobalDragging(false)
    }
    document.addEventListener('dragstart', onStart)
    document.addEventListener('dragend', onEnd)
    document.addEventListener('drop', onEnd)
    return () => {
      document.removeEventListener('dragstart', onStart)
      document.removeEventListener('dragend', onEnd)
      document.removeEventListener('drop', onEnd)
    }
  }, [])

  const visualOpen = dragActive || hovered || pickerOpen || globalDragging

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        // Don't auto-close the picker — only on outside click or after pick.
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        setGlobalDragging(false)
        const fromIndexStr = e.dataTransfer.getData('text/x-block-index')
        const newType = e.dataTransfer.getData('text/x-block-type')
        if (fromIndexStr) {
          const from = Number(fromIndexStr)
          const to = from < index ? index - 1 : index
          if (!Number.isNaN(from)) onReorder(from, to)
        } else if (newType) {
          onInsertNew(newType, index)
        }
      }}
      className={`relative -my-1 transition-all ${visualOpen ? 'h-10' : 'h-2'}`}
    >
      {/* Active drop indicator line */}
      <div
        aria-hidden
        className={`absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full transition-all ${
          dragActive
            ? 'h-1 bg-indigo-500 shadow-lg shadow-indigo-500/50'
            : globalDragging
              ? 'h-0.5 bg-indigo-400/35'
              : hovered || pickerOpen
                ? 'h-0.5 bg-indigo-400/40'
                : 'h-px bg-transparent'
        }`}
      />
      {/* "Drop here" hint that appears during drag */}
      {globalDragging && !dragActive && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-300 ring-1 ring-inset ring-indigo-400/30">
          ▼ Upuść tu
        </div>
      )}
      {dragActive && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-indigo-500/40">
          ✓ Upuść
        </div>
      )}
      {/* Hover-revealed + button (only when NOT dragging) */}
      {(hovered || pickerOpen) && !dragActive && !globalDragging && (
        <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setPickerOpen((v) => !v)
            }}
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-base font-bold text-white shadow-lg shadow-indigo-500/40 transition hover:scale-110 ${pickerOpen ? 'rotate-45' : ''}`}
            title="Wstaw blok"
          >
            +
          </button>
        </div>
      )}
      {pickerOpen && <InlineBlockPicker onPick={(type) => { onInsertNew(type, index); setPickerOpen(false) }} onClose={() => setPickerOpen(false)} />}
    </div>
  )
}


/** Compact popup menu of block types, anchored beneath the DropZone "+" button. */
function InlineBlockPicker({ onPick, onClose }: { onPick: (type: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [onClose])

  // Group types by category for the popup.
  const grouped = (() => {
    const groups: Record<string, string[]> = {}
    for (const type of ALL_BLOCK_TYPES) {
      const cat = (BLOCK_SCHEMAS[type]?.category as string | undefined) ?? 'content'
      ;(groups[cat] = groups[cat] ?? []).push(type)
    }
    const order: BlockCategory[] = ['hero', 'content', 'media', 'data', 'cta', 'layout']
    return order.filter((k) => groups[k]?.length).map((k) => ({ key: k, types: groups[k] }))
  })()

  return (
    <div
      ref={ref}
      className="absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-md"
    >
      <div className="space-y-3">
        {grouped.map(({ key, types }) => {
          const meta = CATEGORY_META[key]
          return (
            <div key={key}>
              <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span>{meta.icon}</span>
                {meta.titlePl}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {types.map((type) => {
                  const s = BLOCK_SCHEMAS[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onPick(type)}
                      className="group flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/60 px-1.5 py-2 text-[10px] text-slate-300 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-slate-900 hover:text-white"
                      title={s?.titlePl ?? type}
                    >
                      <span className="text-base leading-none">{s?.icon ?? '◻'}</span>
                      <span className="text-center leading-tight">{s?.titlePl ?? type}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
