import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { createEventConnection } from '../../lib/signalr'
import { Card } from '../../components/ui'
import { Icon, type IconName } from '../../components/Icon'
import { useEvent } from '../events/api'
import { EventStatus, type DashboardData } from '../../types/api'

interface FeedbackSummary {
  count: number
  average: number
  items: { rating: number; comment: string | null }[]
}

const STATION_COLORS = [
  { bar: 'from-violet-400 to-fuchsia-400', text: 'text-violet-300' },
  { bar: 'from-indigo-400 to-sky-400', text: 'text-indigo-300' },
  { bar: 'from-emerald-400 to-teal-400', text: 'text-emerald-300' },
  { bar: 'from-amber-400 to-orange-400', text: 'text-amber-300' },
  { bar: 'from-pink-400 to-rose-400', text: 'text-pink-300' },
  { bar: 'from-cyan-400 to-blue-400', text: 'text-cyan-300' },
]

function useDashboard(eventId: string) {
  return useQuery({
    queryKey: ['dashboard', eventId],
    queryFn: async () => (await api.get<DashboardData>(`/api/events/${eventId}/dashboard`)).data,
  })
}

function useFeedback(eventId: string) {
  return useQuery({
    queryKey: ['feedback', eventId],
    queryFn: async () => (await api.get<FeedbackSummary>(`/api/events/${eventId}/feedback`)).data,
  })
}

async function downloadReport(eventId: string) {
  const res = await api.get(`/api/events/${eventId}/report`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `raport-${eventId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export function DashboardTab({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useDashboard(eventId)
  const { data: feedback } = useFeedback(eventId)
  const { data: event } = useEvent(eventId)

  // Tick for the countdown widget.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const connection = createEventConnection()
    let active = true

    connection.on('dashboardChanged', (payload: DashboardData) => {
      qc.setQueryData(['dashboard', eventId], payload)
    })

    connection
      .start()
      .then(() => {
        if (active) return connection.invoke('JoinEvent', eventId)
      })
      .catch(() => {
        // live updates unavailable; initial fetch still shows data
      })

    return () => {
      active = false
      void connection.stop()
    }
  }, [eventId, qc])

  // Build a chronological "activity feed" from recent check-ins.
  const activity = useMemo(() => {
    if (!data) return []
    return data.recentCheckIns
      .map((c) => ({ at: new Date(c.at).getTime(), name: c.name }))
      .sort((a, b) => b.at - a.at)
      .slice(0, 12)
  }, [data])

  if (isLoading || !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/40" />
        ))}
      </div>
    )
  }

  const attendanceTarget = 75
  const aboveTarget = data.attendancePct >= attendanceTarget
  const checkedRatio = data.total > 0 ? data.checkedIn / data.total : 0

  // Status / countdown
  const start = event?.startsAt ? new Date(event.startsAt).getTime() : null
  const end = event?.endsAt ? new Date(event.endsAt).getTime() : null
  const phase: 'upcoming' | 'live' | 'ended' | 'unknown' =
    !start || !end ? 'unknown' : now < start ? 'upcoming' : now <= end ? 'live' : 'ended'

  return (
    <div className="space-y-5">
      {/* HERO */}
      <HeroPanel
        eventName={event?.name ?? ''}
        startsAt={event?.startsAt}
        endsAt={event?.endsAt}
        location={event?.location ?? null}
        slug={event?.slug ?? ''}
        status={event?.status ?? EventStatus.Draft}
        phase={phase}
        now={now}
        onDownload={() => downloadReport(eventId)}
      />

      {/* KPI ROW */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon="users"
          accent="violet"
          label={t('dashboard.checkedIn')}
          value={data.checkedIn}
          subValue={`/ ${data.total}`}
          hint={t('dashboard.outOf', { total: data.total })}
          progress={checkedRatio}
        />
        <KpiCard
          icon="bolt"
          accent="indigo"
          label={t('dashboard.attendance')}
          value={`${data.attendancePct}%`}
          hint={t('dashboard.target', { value: attendanceTarget })}
          progress={data.attendancePct / 100}
          badge={aboveTarget ? `≥ ${attendanceTarget}%` : undefined}
          badgeTone={aboveTarget ? 'emerald' : undefined}
        />
        <KpiCard
          icon="calendar"
          accent="sky"
          label={t('dashboard.confirmed')}
          value={data.confirmed}
          subValue={`/ ${data.total}`}
          progress={data.total > 0 ? data.confirmed / data.total : 0}
        />
        <KpiCard
          icon="shield"
          accent="amber"
          label={t('dashboard.noShow')}
          value={data.noShow}
          hint={data.total > 0 ? `${Math.round((data.noShow / data.total) * 100)}%` : '—'}
          progress={data.total > 0 ? data.noShow / data.total : 0}
        />
      </div>

      {/* MAIN GRID */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT 2/3 */}
        <div className="space-y-5 lg:col-span-2">
          {/* Attendance ring + Funnel */}
          <Card>
            <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
              <AttendanceRing pct={data.attendancePct} aboveTarget={aboveTarget} />
              <div className="min-w-0">
                <h3 className="mb-3 text-sm font-semibold text-white">{t('dashboard.funnel')}</h3>
                <Funnel
                  steps={[
                    { label: t('dashboard.funnelInvited'), value: data.invited, color: 'from-indigo-500 to-violet-500' },
                    { label: t('dashboard.funnelConfirmed'), value: data.confirmed, color: 'from-violet-500 to-fuchsia-500' },
                    { label: t('dashboard.funnelCheckedIn'), value: data.checkedIn, color: 'from-emerald-500 to-teal-500' },
                    { label: t('dashboard.funnelCheckedOut'), value: data.checkedOut, color: 'from-sky-500 to-cyan-500' },
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Stations */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{t('dashboard.stations')}</h3>
              <span className="rounded-full bg-sky-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-400/30">
                {data.stations.length}
              </span>
            </div>
            {data.stations.length === 0 ? (
              <EmptyHint icon="qr" label={t('dashboard.noStations')} />
            ) : (
              <ul className="space-y-3">
                {data.stations.map((s, i) => {
                  const total = data.stations.reduce((sum, x) => sum + x.count, 0)
                  const pct = total > 0 ? (s.count / total) * 100 : 0
                  const color = STATION_COLORS[i % STATION_COLORS.length]
                  return (
                    <li key={s.code} className="group">
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${color.bar}`} />
                          <span className="font-medium text-slate-200">{s.code}</span>
                        </span>
                        <span className={`text-xs ${color.text}`}>
                          {s.count} <span className="text-slate-500">· {Math.round(pct)}%</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
                        <div
                          className={`h-full bg-gradient-to-r ${color.bar} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* RIGHT 1/3 */}
        <div className="space-y-5">
          {/* Quick actions */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">{t('dashboard.quickActions')}</h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickAction to={`/events/${eventId}/scanner`} icon="qr" label={t('dashboard.actionScanner')} accent="violet" />
              <QuickAction to={`/events/${eventId}#participants`} icon="users" label={t('dashboard.actionParticipants')} accent="indigo" />
              <QuickAction to={`/events/${eventId}#agenda`} icon="calendar" label={t('dashboard.actionAgenda')} accent="sky" />
              <QuickAction to={`/events/${eventId}#page`} icon="document" label={t('dashboard.actionPage')} accent="emerald" />
            </div>
          </Card>

          {/* Live activity feed */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{t('dashboard.activity')}</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {t('dashboard.live')}
              </span>
            </div>
            {activity.length === 0 ? (
              <EmptyHint icon="users" label={t('dashboard.noActivity')} />
            ) : (
              <ul className="space-y-1 max-h-80 overflow-y-auto pr-1">
                {activity.map((a, i) => (
                  <li
                    key={`${a.at}-${i}`}
                    className="flex items-center gap-2 rounded-lg border-l-2 border-emerald-400/40 bg-slate-800/30 px-3 py-2"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-100">{a.name}</p>
                      <p className="text-[10px] text-slate-500">{relativeTime(a.at, now, i18n.language)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Feedback */}
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-white">{t('feedback.title')}</h3>
            {feedback && feedback.count > 0 ? (
              <FeedbackWidget feedback={feedback} t={t} />
            ) : (
              <EmptyHint icon="sparkles" label={t('dashboard.noFeedback')} />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ===================== Hero =====================
function HeroPanel({
  eventName,
  startsAt,
  endsAt,
  location,
  slug,
  status,
  phase,
  now,
  onDownload,
}: {
  eventName: string
  startsAt?: string
  endsAt?: string
  location: string | null
  slug: string
  status: number
  phase: 'upcoming' | 'live' | 'ended' | 'unknown'
  now: number
  onDownload: () => void
}) {
  const { t, i18n } = useTranslation()
  const phaseMeta = {
    upcoming: { tone: 'amber', text: t('dashboard.untilStart'), pulse: false },
    live: { tone: 'emerald', text: t('dashboard.happeningNow'), pulse: true },
    ended: { tone: 'slate', text: t('dashboard.ended'), pulse: false },
    unknown: { tone: 'slate', text: '', pulse: false },
  }[phase]

  // Countdown to start (if upcoming).
  let countdown: { days: number; hours: number; minutes: number } | null = null
  if (phase === 'upcoming' && startsAt) {
    const diff = Math.max(0, new Date(startsAt).getTime() - now)
    countdown = {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff / 3_600_000) % 24),
      minutes: Math.floor((diff / 60_000) % 60),
    }
  }

  const dateLabel = startsAt
    ? new Date(startsAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'long', year: 'numeric' })
    : ''
  const timeLabel =
    startsAt && endsAt
      ? `${new Date(startsAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })} – ${new Date(endsAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`
      : ''

  const toneClasses: Record<string, { chip: string; dot: string; ring: string }> = {
    emerald: {
      chip: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
      dot: 'bg-emerald-400',
      ring: 'ring-emerald-400/30',
    },
    amber: {
      chip: 'bg-amber-400/15 text-amber-300 ring-amber-400/30',
      dot: 'bg-amber-400',
      ring: 'ring-amber-400/30',
    },
    slate: {
      chip: 'bg-slate-400/10 text-slate-300 ring-slate-400/20',
      dot: 'bg-slate-400',
      ring: 'ring-slate-400/20',
    },
  }
  const tc = toneClasses[phaseMeta.tone]

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-[-6rem] h-60 w-60 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tc.chip}`}
            >
              <span className="relative flex h-1.5 w-1.5">
                {phaseMeta.pulse && (
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${tc.dot} opacity-75`} />
                )}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tc.dot}`} />
              </span>
              {phaseMeta.text}
            </span>
            {status === EventStatus.Published && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-400/30">
                Published
              </span>
            )}
          </div>
          <h1 className="truncate bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
            {eventName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            {dateLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="calendar" className="h-3.5 w-3.5 text-slate-500" />
                {dateLabel}
              </span>
            )}
            {timeLabel && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" className="h-3.5 w-3.5 text-slate-500" />
                {timeLabel}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="mapPin" className="h-3.5 w-3.5 text-slate-500" />
                {location}
              </span>
            )}
            {slug && (
              <code className="rounded-md border border-slate-800/80 bg-slate-950/60 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                /{slug}
              </code>
            )}
          </div>
        </div>

        {/* Countdown blocks */}
        {countdown && (
          <div className="flex gap-2">
            <CountdownTile value={countdown.days} label={t('dashboard.days')} />
            <CountdownTile value={countdown.hours} label={t('dashboard.hours')} />
            <CountdownTile value={countdown.minutes} label={t('dashboard.minutes')} />
          </div>
        )}

        <button
          onClick={onDownload}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white"
        >
          <Icon name="document" className="h-3.5 w-3.5" />
          {t('dashboard.report')}
        </button>
      </div>
    </div>
  )
}

function CountdownTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex h-16 w-14 flex-col items-center justify-center rounded-xl border border-slate-700/60 bg-slate-950/70 shadow-inner">
      <span className="text-2xl font-bold tabular-nums text-white">{String(value).padStart(2, '0')}</span>
      <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</span>
    </div>
  )
}

// ===================== KPI card =====================
function KpiCard({
  icon,
  accent,
  label,
  value,
  subValue,
  hint,
  progress,
  badge,
  badgeTone,
}: {
  icon: IconName
  accent: 'indigo' | 'violet' | 'sky' | 'amber' | 'emerald'
  label: string
  value: number | string
  subValue?: string
  hint?: string
  progress?: number
  badge?: string
  badgeTone?: 'emerald' | 'rose' | 'amber'
}) {
  const a = {
    indigo: { halo: 'from-indigo-500/30 to-violet-500/10', ring: 'ring-indigo-400/30', icon: 'text-indigo-200', bar: 'from-indigo-400 to-violet-400' },
    violet: { halo: 'from-violet-500/30 to-fuchsia-500/10', ring: 'ring-violet-400/30', icon: 'text-violet-200', bar: 'from-violet-400 to-fuchsia-400' },
    sky: { halo: 'from-sky-500/30 to-cyan-500/10', ring: 'ring-sky-400/30', icon: 'text-sky-200', bar: 'from-sky-400 to-cyan-400' },
    amber: { halo: 'from-amber-500/30 to-orange-500/10', ring: 'ring-amber-400/30', icon: 'text-amber-200', bar: 'from-amber-400 to-orange-400' },
    emerald: { halo: 'from-emerald-500/30 to-teal-500/10', ring: 'ring-emerald-400/30', icon: 'text-emerald-200', bar: 'from-emerald-400 to-teal-400' },
  }[accent]
  const bTone = {
    emerald: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
    rose: 'bg-rose-400/15 text-rose-300 ring-rose-400/30',
    amber: 'bg-amber-400/15 text-amber-300 ring-amber-400/30',
  }
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 backdrop-blur">
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${a.halo} blur-2xl`} />
      <div className="relative flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950/60 ring-1 ring-inset ${a.ring} ${a.icon}`}>
          <Icon name={icon} className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-2 flex items-baseline gap-1">
        <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
        {subValue && <p className="text-sm text-slate-500">{subValue}</p>}
        {badge && badgeTone && (
          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${bTone[badgeTone]}`}>
            {badge}
          </span>
        )}
      </div>
      {hint && <p className="relative mt-1 text-[11px] text-slate-500">{hint}</p>}
      {typeof progress === 'number' && (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full bg-gradient-to-r ${a.bar} transition-all`}
            style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ===================== Attendance ring =====================
function AttendanceRing({ pct, aboveTarget }: { pct: number; aboveTarget: boolean }) {
  const { t } = useTranslation()
  const radius = 64
  const stroke = 12
  const c = 2 * Math.PI * radius
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c
  const gradId = 'ring-grad'

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={160} height={160} viewBox="0 0 160 160">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={aboveTarget ? '#10b981' : '#6366f1'} />
            <stop offset="100%" stopColor={aboveTarget ? '#14b8a6' : '#a855f7'} />
          </linearGradient>
        </defs>
        <circle cx={80} cy={80} r={radius} stroke="rgb(30 41 59)" strokeWidth={stroke} fill="none" />
        <circle
          cx={80}
          cy={80}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          transform="rotate(-90 80 80)"
          style={{ transition: 'stroke-dasharray 600ms ease-out' }}
        />
        <text x={80} y={75} textAnchor="middle" className="fill-white text-3xl font-bold" style={{ fontSize: 30 }}>
          {pct}%
        </text>
        <text
          x={80}
          y={100}
          textAnchor="middle"
          className="fill-slate-400 text-[10px] uppercase"
          style={{ fontSize: 10, letterSpacing: '0.2em' }}
        >
          {t('dashboard.attendance')}
        </text>
      </svg>
    </div>
  )
}

// ===================== Funnel =====================
function Funnel({ steps }: { steps: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value))
  return (
    <ul className="space-y-2">
      {steps.map((s, i) => {
        const pct = (s.value / max) * 100
        const dropPct = i > 0 && steps[0].value > 0 ? Math.round((s.value / steps[0].value) * 100) : null
        return (
          <li key={s.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">{s.label}</span>
              <span className="font-mono tabular-nums text-slate-400">
                {s.value}
                {dropPct !== null && i > 0 && <span className="ml-2 text-slate-500">({dropPct}%)</span>}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800/80">
              <div
                className={`h-full bg-gradient-to-r ${s.color} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ===================== Quick action =====================
function QuickAction({
  to,
  icon,
  label,
  accent,
}: {
  to: string
  icon: IconName
  label: string
  accent: 'indigo' | 'violet' | 'sky' | 'emerald'
}) {
  const a = {
    indigo: { bg: 'from-indigo-500/20 to-violet-500/10', ring: 'ring-indigo-400/30', icon: 'text-indigo-200' },
    violet: { bg: 'from-violet-500/20 to-fuchsia-500/10', ring: 'ring-violet-400/30', icon: 'text-violet-200' },
    sky: { bg: 'from-sky-500/20 to-cyan-500/10', ring: 'ring-sky-400/30', icon: 'text-sky-200' },
    emerald: { bg: 'from-emerald-500/20 to-teal-500/10', ring: 'ring-emerald-400/30', icon: 'text-emerald-200' },
  }[accent]
  return (
    <Link
      to={to}
      className={`group flex flex-col items-start gap-1.5 rounded-xl border border-slate-800 bg-gradient-to-br ${a.bg} p-3 transition hover:-translate-y-0.5 hover:border-indigo-400/40`}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950/60 ring-1 ring-inset ${a.ring} ${a.icon}`}>
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="text-xs font-medium text-slate-200 group-hover:text-white">{label}</span>
    </Link>
  )
}

// ===================== Feedback widget =====================
function FeedbackWidget({
  feedback,
  t,
}: {
  feedback: FeedbackSummary
  t: (k: string) => string
}) {
  // distribution by star
  const dist = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: feedback.items.filter((it) => it.rating === star).length,
  }))
  const max = Math.max(1, ...dist.map((d) => d.count))
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <p className="text-4xl font-bold tabular-nums text-white">{feedback.average.toFixed(1)}</p>
        <p className="text-sm text-slate-400">/ 5</p>
        <p className="ml-auto text-xs text-slate-500">
          {feedback.count} {t('dashboard.ratings')}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg
            key={s}
            viewBox="0 0 24 24"
            className={`h-4 w-4 ${s <= Math.round(feedback.average) ? 'fill-amber-400' : 'fill-slate-700'}`}
            aria-hidden
          >
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        ))}
      </div>
      <ul className="space-y-1">
        {dist
          .slice()
          .reverse()
          .map((d) => (
            <li key={d.star} className="flex items-center gap-2 text-[11px]">
              <span className="w-3 text-slate-500">{d.star}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                <span
                  className="block h-full bg-gradient-to-r from-amber-400 to-orange-400"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </span>
              <span className="w-6 text-right tabular-nums text-slate-400">{d.count}</span>
            </li>
          ))}
      </ul>
    </div>
  )
}

// ===================== Helpers =====================
function EmptyHint({ icon, label }: { icon: IconName; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/60 text-slate-500">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="mt-2 text-xs text-slate-500">{label}</p>
    </div>
  )
}

function relativeTime(at: number, now: number, lang: string): string {
  const diff = Math.max(0, now - at)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return lang === 'en' ? 'just now' : 'przed chwilą'
  if (min < 60) return lang === 'en' ? `${min}m ago` : `${min} min temu`
  const h = Math.floor(min / 60)
  if (h < 24) return lang === 'en' ? `${h}h ago` : `${h} godz temu`
  return new Date(at).toLocaleString(lang, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
