import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvents } from './api'
import { SmartEventForm } from './SmartEventForm'
import { AppShell, type NavItem } from '../../components/AppShell'
import { Button, Card } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useAuthStore } from '../../stores/authStore'
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
      className="group relative block overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-indigo-400/50 hover:shadow-2xl hover:shadow-indigo-500/20"
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
      <p className="relative mt-2 text-3xl font-bold tabular-nums tracking-tight text-white">
        <AnimatedCount value={value} />
      </p>
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
      {/* Page-level decorative backdrop with aurora + mouse spotlight */}
      <PageBackdrop />

      {/* Personalized greeting hero */}
      <WelcomeHero stats={stats} upcoming={upcoming[0]} now={now} onNew={() => setShowForm(true)} />

      {/* Stats row with animated counters */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

// ===================== PageBackdrop =====================
// Aurora + dot grid + mouse-tracking spotlight. Lives behind everything via
// fixed positioning so it follows scroll for free.
function PageBackdrop() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    function onMove(e: MouseEvent) {
      node!.style.setProperty('--mx', `${e.clientX}px`)
      node!.style.setProperty('--my', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ ['--mx' as string]: '50vw', ['--my' as string]: '50vh' }}
    >
      <div
        className="absolute -left-1/4 top-[-10%] h-[120%] w-[70%] rounded-full blur-3xl opacity-40 animate-aurora-a"
        style={{ background: 'radial-gradient(closest-side, rgba(99,102,241,0.45), transparent 70%)' }}
      />
      <div
        className="absolute right-[-20%] top-[20%] h-[100%] w-[60%] rounded-full blur-3xl opacity-35 animate-aurora-b"
        style={{ background: 'radial-gradient(closest-side, rgba(217,70,239,0.4), transparent 70%)' }}
      />
      <div className="absolute bottom-[-6rem] left-1/3 h-[22rem] w-[22rem] rounded-full bg-fuchsia-600/12 blur-3xl animate-pulse-slow [animation-delay:3s]" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'radial-gradient(rgb(148 163 184) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(360px circle at var(--mx) var(--my), rgba(165,180,252,0.10), transparent 60%)',
        }}
        aria-hidden
      />
    </div>
  )
}

// ===================== WelcomeHero =====================
function WelcomeHero({
  stats,
  upcoming,
  now,
  onNew,
}: {
  stats: { total: number; live: number; published: number; draft: number }
  upcoming: EventDto | undefined
  now: number
  onNew: () => void
}) {
  const { t, i18n } = useTranslation()
  const displayName = useAuthStore((s) => s.displayName)

  const hour = new Date().getHours()
  const greetingKey =
    hour < 5
      ? 'events.greetingNight'
      : hour < 12
        ? 'events.greetingMorning'
        : hour < 17
          ? 'events.greetingDay'
          : 'events.greetingEvening'

  const upcomingCount = stats.total - stats.draft
  const summary =
    stats.total === 0
      ? t('events.summaryEmpty')
      : stats.live > 0
        ? t('events.summaryHasLive', { live: stats.live, upcoming: upcomingCount })
        : upcomingCount > 0
          ? t('events.summaryUpcoming', { upcoming: upcomingCount })
          : t('events.summaryOnlyPast')

  return (
    <div className="fade-up relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 p-5 backdrop-blur sm:p-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-[-4rem] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-12 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
      />

      <div className="relative grid items-center gap-5 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
              {t(greetingKey)}
            </span>
            {displayName && (
              <>
                <span className="text-slate-500">,</span>{' '}
                <span className="text-white">{displayName.split(' ')[0]}</span>
              </>
            )}
            <span className="ml-1 inline-block animate-pulse-slow">👋</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-300/90">{summary}</p>
        </div>

        <div className="lg:w-[360px]">
          {upcoming ? <NextEventCountdown ev={upcoming} now={now} /> : <BigCreateCTA onNew={onNew} />}
        </div>
      </div>
    </div>
  )
}

// ===================== NextEventCountdown =====================
function NextEventCountdown({ ev, now }: { ev: EventDto; now: number }) {
  const { t, i18n } = useTranslation()
  const start = new Date(ev.startsAt).getTime()
  const end = new Date(ev.endsAt).getTime()
  const isLive = now >= start && now <= end
  const diff = isLive ? end - now : start - now
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff / 3_600_000) % 24)
  const minutes = Math.floor((diff / 60_000) % 60)
  const pretty = prettifyEventName(ev.name)
  const display = pretty.isAuto ? t('dashboard.untitled') : pretty.display

  return (
    <Link
      to={`/events/${ev.id}`}
      className="group relative block overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-2xl hover:shadow-indigo-500/10"
    >
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/15 blur-2xl transition group-hover:bg-violet-500/25" />
      <div className="relative flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {isLive ? t('events.happeningNow') : t('events.nextEvent')}
        </p>
        {isLive && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE
          </span>
        )}
      </div>
      <p className="relative mt-1 truncate text-base font-semibold text-white group-hover:text-indigo-200">{display}</p>
      <p className="relative mt-0.5 text-[11px] text-slate-400">
        {new Date(ev.startsAt).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
      {!isLive && (
        <div className="relative mt-3 flex gap-2">
          <CountdownTile value={days} label={t('dashboard.days')} />
          <CountdownTile value={hours} label={t('dashboard.hours')} />
          <CountdownTile value={minutes} label={t('dashboard.minutes')} />
        </div>
      )}
    </Link>
  )
}

function CountdownTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center rounded-lg border border-slate-800/80 bg-slate-900/60 py-1.5">
      <span className="text-lg font-bold tabular-nums text-white">{String(Math.max(0, value)).padStart(2, '0')}</span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</span>
    </div>
  )
}

// ===================== BigCreateCTA =====================
function BigCreateCTA({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onNew}
      className="group relative block w-full overflow-hidden rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 via-violet-500/10 to-fuchsia-500/15 p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-400/60"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-2xl transition group-hover:bg-violet-500/30" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
          <Icon name="plus" className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{t('events.new')}</p>
          <p className="text-[11px] text-slate-300/90">{t('events.summaryEmpty')}</p>
        </div>
        <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 text-indigo-200 transition group-hover:translate-x-1" fill="none" aria-hidden>
          <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}

// ===================== AnimatedCount =====================
function AnimatedCount({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const [display, setDisplay] = useState(value)
  const startRef = useRef<{ ts: number; from: number; to: number } | null>(null)
  const seenRef = useRef(value)

  useEffect(() => {
    if (seenRef.current === value) return
    startRef.current = { ts: performance.now(), from: seenRef.current, to: value }
    seenRef.current = value
    let raf = 0
    const tick = () => {
      const s = startRef.current
      if (!s) return
      const elapsed = performance.now() - s.ts
      const t = Math.min(1, elapsed / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(s.from + (s.to - s.from) * eased)
      setDisplay(current)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  return <>{display}</>
}
