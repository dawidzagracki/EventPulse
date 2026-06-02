import { useEffect, useState, type ReactNode } from 'react'
import type { AgendaItemDto, BrandingDto, PageBlock } from '../../types/api'
import { AgendaItemTypeName } from '../../types/api'
import { getBlockStyle } from './blockStyles'

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
    ? `linear-gradient(180deg, rgba(15,18,32,0.35), rgba(15,18,32,0.7)), url('${bg}') center/cover`
    : `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
  return (
    <section
      id={`block-${block.id}`}
      className={`relative overflow-hidden rounded-3xl ${stl.className}`}
      style={{ background: defaultBg, ...stl.style }}
    >
      <div className="px-6 py-20 text-center text-white sm:px-12 sm:py-32">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/85">
          <E block={block} k="subtitle" ctx={ctx} placeholder="NADTYTUŁ" />
        </p>
        <h1 className="mt-6 text-balance text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl">
          <E block={block} k="title" ctx={ctx} placeholder="Tytuł wydarzenia" />
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base text-white/90 sm:text-lg">
          <E block={block} k="dateLabel" ctx={ctx} placeholder="Data" />
          <span className="px-2 text-white/50">•</span>
          <E block={block} k="location" ctx={ctx} placeholder="Miejsce" />
        </p>
        <span className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-slate-900 shadow-2xl shadow-black/30 transition hover:scale-[1.02]">
          <E block={block} k="ctaLabel" ctx={ctx} placeholder="Zarejestruj się" />
        </span>
      </div>
    </section>
  )
}

function DescriptionBlock({ block, ctx }: { block: PageBlock; ctx: BlockContext }) {
  const stl = getBlockStyle(block)
  return (
    <section
      id={`block-${block.id}`}
      className={`rounded-3xl bg-white p-10 shadow-sm ring-1 ring-slate-200 sm:p-14 ${stl.className}`}
      style={stl.style}
    >
      <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: stl.titleColor ?? '#0f172a' }}>
        <E block={block} k="title" ctx={ctx} placeholder="Tytuł sekcji" />
      </h2>
      <div
        className="mt-6 max-w-3xl whitespace-pre-wrap text-lg leading-relaxed"
        style={{ color: stl.textColor ?? '#475569' }}
      >
        <E block={block} k="body" ctx={ctx} placeholder="Opisz tu swoje wydarzenie..." />
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

/** Slim drop zone between blocks. Highlights on dragover and accepts both reorder and palette drops. */
export function DropZone({
  index,
  onReorder,
  onInsertNew,
}: {
  index: number
  onReorder: (from: number, to: number) => void
  onInsertNew: (type: string, at: number) => void
}) {
  const [active, setActive] = useState(false)
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setActive(true)
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setActive(false)
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
      className={`-my-1 h-2 rounded-full transition ${
        active ? 'h-3 bg-indigo-500 shadow-lg shadow-indigo-500/40' : 'bg-transparent'
      }`}
      aria-hidden
    />
  )
}
