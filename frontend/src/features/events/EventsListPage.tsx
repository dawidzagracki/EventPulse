import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvents } from './api'
import { SmartEventForm } from './SmartEventForm'
import { AppShell, type NavItem } from '../../components/AppShell'
import { Button, Card } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { EventStatus, type EventDto } from '../../types/api'
import { prettifyEventName } from './eventName'

type FilterKey = 'all' | 'draft' | 'published' | 'live' | 'completed'

const FILTERS: { key: FilterKey; statuses: number[] | null }[] = [
  { key: 'all', statuses: null },
  { key: 'live', statuses: [EventStatus.Live] },
  { key: 'published', statuses: [EventStatus.Published] },
  { key: 'draft', statuses: [EventStatus.Draft] },
  { key: 'completed', statuses: [EventStatus.Completed, EventStatus.Archived] },
]

function statusMeta(status: number) {
  switch (status) {
    case EventStatus.Live:
      return {
        label: 'Live',
        chip: 'bg-emerald-400/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30',
        bar: 'from-emerald-400 via-teal-400 to-emerald-500',
        glow: 'bg-emerald-500/10',
        dot: 'bg-emerald-400',
        pulse: true,
      }
    case EventStatus.Published:
      return {
        label: 'Published',
        chip: 'bg-sky-400/15 text-sky-300 ring-1 ring-inset ring-sky-400/30',
        bar: 'from-sky-400 via-indigo-400 to-sky-500',
        glow: 'bg-sky-500/10',
        dot: 'bg-sky-400',
        pulse: false,
      }
    case EventStatus.Completed:
      return {
        label: 'Completed',
        chip: 'bg-violet-400/15 text-violet-300 ring-1 ring-inset ring-violet-400/30',
        bar: 'from-violet-400 via-fuchsia-400 to-violet-500',
        glow: 'bg-violet-500/10',
        dot: 'bg-violet-400',
        pulse: false,
      }
    case EventStatus.Archived:
      return {
        label: 'Archived',
        chip: 'bg-slate-400/10 text-slate-300 ring-1 ring-inset ring-slate-400/20',
        bar: 'from-slate-500 via-slate-400 to-slate-500',
        glow: 'bg-slate-500/10',
        dot: 'bg-slate-400',
        pulse: false,
      }
    default:
      return {
        label: 'Draft',
        chip: 'bg-amber-400/15 text-amber-300 ring-1 ring-inset ring-amber-400/30',
        bar: 'from-amber-400 via-orange-400 to-amber-500',
        glow: 'bg-amber-500/10',
        dot: 'bg-amber-400',
        pulse: false,
      }
  }
}

function formatDate(iso: string, lang: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(lang, { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatTime(iso: string, lang: string) {
  return new Date(iso).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
}

function EventCard({ ev }: { ev: EventDto }) {
  const { i18n, t } = useTranslation()
  const meta = statusMeta(ev.status)
  const start = new Date(ev.startsAt)
  const end = new Date(ev.endsAt)
  const sameDay = start.toDateString() === end.toDateString()
  const day = start.getDate().toString().padStart(2, '0')
  const month = start.toLocaleDateString(i18n.language, { month: 'short' }).replace('.', '').toUpperCase()
  const pretty = prettifyEventName(ev.name)
  const displayName = pretty.isAuto ? t('dashboard.untitled') : pretty.display
  const fullName = pretty.full

  return (
    <Link
      to={`/events/${ev.id}`}
      title={fullName !== displayName ? fullName : undefined}
      className="group relative block overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-2xl hover:shadow-indigo-500/10"
    >
      {/* left accent bar — status color */}
      <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${meta.bar}`} />
      {/* subtle status-tinted glow in top-right */}
      <div className={`pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full ${meta.glow} blur-3xl transition group-hover:opacity-70`} />
      {/* corner gradient overlay (login-card style) */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/[0.06] via-transparent to-violet-500/[0.06] opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-center gap-4 p-4 pl-5">
        {/* date tile */}
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-slate-950/70 shadow-inner shadow-slate-950/40">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{month}</span>
          <span className="text-xl font-bold text-white">{day}</span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Name */}
          <h3 className="truncate text-base font-semibold text-white group-hover:text-indigo-200">{displayName}</h3>

          {/* Single info row: status + time + location */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>
              <span className="relative flex h-1.5 w-1.5">
                {meta.pulse && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${meta.dot} opacity-75`} />
                )}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              </span>
              {meta.label}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" className="h-3.5 w-3.5 text-slate-500" />
              {sameDay
                ? `${formatDate(ev.startsAt, i18n.language)} · ${formatTime(ev.startsAt, i18n.language)}–${formatTime(ev.endsAt, i18n.language)}`
                : `${formatDate(ev.startsAt, i18n.language)} → ${formatDate(ev.endsAt, i18n.language)}`}
            </span>
            {ev.location && (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Icon name="mapPin" className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{ev.location}</span>
              </span>
            )}
          </div>
        </div>

        {/* Trailing controls */}
        <div className="flex shrink-0 items-center gap-1">
          {ev.status >= EventStatus.Published && (
            <a
              href={`/public/${ev.slug}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              title={t('events.preview')}
            >
              <Icon name="externalLink" className="h-3.5 w-3.5" />
            </a>
          )}
          <span className="hidden items-center gap-1 rounded-md bg-slate-800/50 px-2 py-1 text-[11px] font-medium text-slate-200 ring-1 ring-inset ring-slate-700/60 transition group-hover:bg-indigo-500/20 group-hover:text-indigo-100 group-hover:ring-indigo-400/40 md:inline-flex">
            {t('events.open')}
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
              <path d="M9 6l6 6-6 6V6z" />
            </svg>
          </span>
        </div>
      </div>

    </Link>
  )
}

interface MiniStatProps {
  label: string
  value: number
  accent: 'indigo' | 'amber' | 'sky' | 'emerald'
  icon: 'calendar' | 'sparkles' | 'bolt' | 'document'
}

function MiniStat({ label, value, accent, icon }: MiniStatProps) {
  const accents = {
    indigo: { bg: 'from-indigo-500/30 to-violet-500/10', text: 'text-indigo-200', ring: 'ring-indigo-400/30' },
    amber: { bg: 'from-amber-500/30 to-orange-500/10', text: 'text-amber-200', ring: 'ring-amber-400/30' },
    sky: { bg: 'from-sky-500/30 to-cyan-500/10', text: 'text-sky-200', ring: 'ring-sky-400/30' },
    emerald: { bg: 'from-emerald-500/30 to-teal-500/10', text: 'text-emerald-200', ring: 'ring-emerald-400/30' },
  }[accent]
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 backdrop-blur">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${accents.bg} blur-2xl`} />
      <div className="relative flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950/60 ring-1 ring-inset ${accents.ring} ${accents.text}`}>
          <Icon name={icon} className="h-4 w-4" />
        </div>
      </div>
      <p className="relative mt-2 text-3xl font-bold tracking-tight text-white">{value}</p>
    </div>
  )
}

export function EventsListPage() {
  const { t, i18n } = useTranslation()
  const { data: events, isLoading } = useEvents()
  const [showForm, setShowForm] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterKey>('all')

  const stats = useMemo(() => {
    const list = events ?? []
    return {
      total: list.length,
      draft: list.filter((e) => e.status === EventStatus.Draft).length,
      published: list.filter((e) => e.status === EventStatus.Published).length,
      live: list.filter((e) => e.status === EventStatus.Live).length,
    }
  }, [events])

  const filtered = useMemo(() => {
    const list = events ?? []
    const f = FILTERS.find((x) => x.key === filter)
    const byStatus = !f || f.statuses === null ? list : list.filter((e) => f.statuses!.includes(e.status))
    const q = query.trim().toLowerCase()
    if (!q) return byStatus
    return byStatus.filter(
      (e) => e.name.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q) || (e.location ?? '').toLowerCase().includes(q),
    )
  }, [events, filter, query])

  // Tick once a minute so the upcoming/past partition stays fresh without re-computing on every render.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const { upcoming, past } = useMemo(() => {
    const upc: typeof filtered = []
    const pst: typeof filtered = []
    for (const e of filtered) {
      if (new Date(e.endsAt).getTime() >= now) upc.push(e)
      else pst.push(e)
    }
    upc.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    pst.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
    return { upcoming: upc, past: pst }
  }, [filtered, now])

  const nav: NavItem[] = [{ id: 'events', label: t('events.title'), icon: 'calendar', to: '/events', active: true }]

  const filterLabel: Record<FilterKey, string> = {
    all: t('events.filterAll'),
    draft: t('events.statDraft'),
    published: t('events.statPublished'),
    live: t('events.statLive'),
    completed: t('events.past'),
  }

  return (
    <AppShell
      nav={nav}
      title={t('events.title')}
      subtitle={t('events.subtitle')}
      actions={
        <Button onClick={() => setShowForm((v) => !v)}>
          <Icon name="plus" className="h-4 w-4" />
          {t('events.new')}
        </Button>
      }
    >
      {/* Page-level decorative backdrop (matches login style) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[26rem] w-[26rem] rounded-full bg-indigo-600/20 blur-3xl animate-pulse-slow" />
        <div className="absolute right-[-8rem] top-1/3 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-3xl animate-pulse-slow [animation-delay:1.5s]" />
        <div className="absolute bottom-[-6rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-fuchsia-600/15 blur-3xl animate-pulse-slow [animation-delay:3s]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(rgb(148 163 184) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Hero pill */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
          </span>
          {stats.live > 0
            ? `${stats.live} ${t('events.statLive').toLowerCase()}`
            : `${stats.total} ${t('events.statTotal').toLowerCase()}`}
        </span>
        {stats.published > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200">
            <Icon name="sparkles" className="h-3 w-3" />
            {stats.published} {t('events.statPublished').toLowerCase()}
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label={t('events.statTotal')} value={stats.total} accent="indigo" icon="calendar" />
        <MiniStat label={t('events.statLive')} value={stats.live} accent="emerald" icon="bolt" />
        <MiniStat label={t('events.statPublished')} value={stats.published} accent="sky" icon="sparkles" />
        <MiniStat label={t('events.statDraft')} value={stats.draft} accent="amber" icon="document" />
      </div>

      {/* Search + filter chips */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('events.search')}
            className="w-full rounded-xl border border-slate-800/80 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none ring-0 transition focus:border-indigo-400/60 focus:bg-slate-950/80 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800/80 bg-slate-950/40 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === f.key
                  ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-white shadow-inner shadow-indigo-500/20 ring-1 ring-inset ring-indigo-400/40'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              {filterLabel[f.key]}
            </button>
          ))}
        </div>
      </div>

      {/* Create form — smart wizard with presets, auto end, live validation */}
      {showForm && (
        <SmartEventForm onCancel={() => setShowForm(false)} onCreated={() => setShowForm(false)} />
      )}

      {/* Content */}
      <div className="mt-6">
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/40" />
            ))}
          </div>
        ) : !events || events.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
              <Icon name="calendar" className="h-7 w-7 text-indigo-200" />
            </div>
            <p className="mt-4 text-base font-semibold text-white">{t('events.empty')}</p>
            <p className="mt-1 text-sm text-slate-400">{t('events.subtitle')}</p>
            <Button className="mt-5" onClick={() => setShowForm(true)}>
              <Icon name="plus" className="h-4 w-4" />
              {t('events.new')}
            </Button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="py-12 text-center text-sm text-slate-400">{t('events.noMatch')}</Card>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-1 w-6 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{t('events.upcoming')}</h2>
                  <span className="text-xs text-slate-500">· {upcoming.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {upcoming.map((ev) => (
                    <EventCard key={ev.id} ev={ev} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-1 w-6 rounded-full bg-slate-700" />
                  <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t('events.past')}</h2>
                  <span className="text-xs text-slate-500">· {past.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {past.map((ev) => (
                    <EventCard key={ev.id} ev={ev} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* keep i18n.language in scope so we don't get a "noUnused" warning if removed later */}
      <span className="hidden">{i18n.language}</span>
    </AppShell>
  )
}
