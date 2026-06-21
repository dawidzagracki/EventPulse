import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui'
import { Icon, type IconName } from '../../components/Icon'
import { useEvent, useUpdateEvent, useEventClients, useSetEventClients } from './api'
import { prettifyEventName } from './eventName'
import { useParticipants } from '../participants/api'
import { useAgenda } from '../agenda/api'
import { usePage } from '../content/api'
import { useClients } from '../team/api'
import { useAuthStore } from '../../stores/authStore'
import { EventStatus } from '../../types/api'

export function OverviewTab({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation()
  const { data: event } = useEvent(eventId)
  const { data: participants } = useParticipants(eventId)
  const { data: agenda } = useAgenda(eventId)
  const { data: page } = usePage(eventId)
  const updateEvent = useUpdateEvent(eventId)
  const isClient = useAuthStore((s) => s.principalType) === 'Client'

  // Tick once a minute to refresh phase pill / countdown.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Inline rename state.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!event) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/40" />
        ))}
      </div>
    )
  }

  const pretty = prettifyEventName(event.name)
  const start = new Date(event.startsAt).getTime()
  const end = new Date(event.endsAt).getTime()
  const phase: 'upcoming' | 'live' | 'ended' = now < start ? 'upcoming' : now <= end ? 'live' : 'ended'
  const durationMs = Math.max(0, end - start)
  const durationDays = Math.floor(durationMs / 86_400_000)
  const durationHrs = Math.floor((durationMs / 3_600_000) % 24)
  const durationMin = Math.floor((durationMs / 60_000) % 60)

  const publicUrl = `${window.location.origin}/public/events/${eventId}`
  const slug = event.slug

  async function commitRename() {
    if (!event) return
    const trimmed = draft.trim()
    if (!trimmed || trimmed === event.name) {
      setEditing(false)
      return
    }
    await updateEvent.mutateAsync({
      name: trimmed,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
    })
    setEditing(false)
  }

  const dateLabel = new Date(event.startsAt).toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const timeRange = `${new Date(event.startsAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  })} – ${new Date(event.endsAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`

  return (
    <div className="space-y-5">
      {/* ===== HERO ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-[-5rem] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PhaseChip phase={phase} />
              <StatusChip status={event.status} />
              <code className="rounded-md border border-slate-800/80 bg-slate-950/60 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                /{slug}
              </code>
            </div>

            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitRename()
                    if (e.key === 'Escape') setEditing(false)
                  }}
                  className="flex-1 rounded-lg border border-indigo-400/60 bg-slate-950/60 px-3 py-2 text-2xl font-bold text-white outline-none ring-2 ring-indigo-500/20"
                />
                <button
                  onClick={() => void commitRename()}
                  disabled={updateEvent.isPending}
                  className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                >
                  ✓
                </button>
                <button onClick={() => setEditing(false)} className="rounded-lg px-3 py-2 text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1
                  title={pretty.isAuto ? pretty.full : undefined}
                  className={`truncate bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent ${
                    pretty.isAuto ? 'italic opacity-80' : ''
                  }`}
                >
                  {pretty.isAuto ? t('dashboard.untitled') : pretty.display}
                </h1>
                <button
                  onClick={() => {
                    setDraft(pretty.isAuto ? '' : pretty.full)
                    setEditing(true)
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-[11px] font-medium text-slate-300 transition hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white"
                >
                  ✏ {t('dashboard.rename')}
                </button>
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
              <InfoBit icon="calendar">{dateLabel}</InfoBit>
              <InfoBit icon="clock">{timeRange}</InfoBit>
              {event.location && <InfoBit icon="mapPin">{event.location}</InfoBit>}
            </div>
          </div>
        </div>
      </div>

      {/* ===== QUICK STATS ===== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          icon="users"
          accent="violet"
          label={t('eventDetail.statParticipants')}
          value={participants?.length ?? 0}
          to={`/events/${eventId}#participants`}
        />
        <MiniStat
          icon="calendar"
          accent="sky"
          label={t('eventDetail.statAgenda')}
          value={agenda?.length ?? 0}
          to={`/events/${eventId}#agenda`}
        />
        <MiniStat
          icon="document"
          accent="indigo"
          label={t('eventDetail.statBlocks')}
          value={page?.content.blocks.length ?? 0}
          to={`/events/${eventId}#page`}
        />
        <MiniStat
          icon="image"
          accent="amber"
          label={t('eventDetail.statPhotos')}
          value={0}
          to={`/events/${eventId}#gallery`}
        />
      </div>

      {/* ===== MAIN 2-COL ===== */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* LEFT 2/3 */}
        <div className="space-y-5 lg:col-span-2">
          {/* Schedule */}
          <Card>
            <SectionHeader icon="calendar" title={t('eventDetail.schedule')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label={t('events.starts')}>
                {new Date(event.startsAt).toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'short' })}
              </DetailRow>
              <DetailRow label={t('events.ends')}>
                {new Date(event.endsAt).toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'short' })}
              </DetailRow>
              <DetailRow label={t('eventDetail.duration')}>
                {durationDays > 0 && `${durationDays} ${t('dashboard.days')} `}
                {durationHrs > 0 && `${durationHrs} ${t('dashboard.hours')} `}
                {durationMin > 0 && `${durationMin} ${t('dashboard.minutes')}`}
              </DetailRow>
              <DetailRow label={t('eventDetail.timezone')}>
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </DetailRow>
            </div>
          </Card>

          {/* Location */}
          <Card>
            <SectionHeader icon="mapPin" title={t('events.location')} />
            {event.location ? (
              <div className="space-y-3">
                <p className="text-base text-white">{event.location}</p>
                <iframe
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                  className="h-56 w-full rounded-lg border border-slate-800/80"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="map"
                />
              </div>
            ) : (
              <EmptyBlock icon="mapPin" title={t('eventDetail.noLocation')} cta={t('eventDetail.addLocation')} />
            )}
          </Card>

          {/* Description */}
          {event.description ? (
            <Card>
              <SectionHeader icon="document" title={t('eventDetail.description')} />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{event.description}</p>
            </Card>
          ) : (
            <Card>
              <SectionHeader icon="document" title={t('eventDetail.description')} />
              <EmptyBlock icon="document" title={t('eventDetail.noDescription')} />
            </Card>
          )}
        </div>

        {/* RIGHT 1/3 */}
        <div className="space-y-5">
          {/* Public page */}
          <Card>
            <SectionHeader icon="externalLink" title={t('eventDetail.publicPage')} />
            {page?.hasPublished ? (
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t('eventDetail.pageVersion', { version: page.publishedVersion })}
                </span>
                <CopyableUrl url={publicUrl} />
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-400/30 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:from-indigo-500/30 hover:to-violet-500/30"
                >
                  <Icon name="externalLink" className="h-3.5 w-3.5" />
                  {t('eventDetail.open')}
                </a>
              </div>
            ) : (
              <div>
                <EmptyBlock icon="externalLink" title={t('eventDetail.noPagePublished')} subtitle={t('eventDetail.noPagePublishedHint')} />
                <Link
                  to={`/events/${eventId}#page`}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white"
                >
                  ✏ {t('eventDetail.edit')}
                </Link>
              </div>
            )}
          </Card>

          {/* Branding */}
          <Card>
            <SectionHeader icon="sparkles" title={t('eventDetail.branding')} />
            {page ? <BrandingPreview branding={page.branding} t={t} /> : <p className="text-xs text-slate-500">—</p>}
          </Card>

          {/* Languages */}
          <Card>
            <SectionHeader icon="document" title={t('eventDetail.languages')} />
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-400/15 px-2.5 py-1 text-xs font-semibold text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
                <Icon name="check" className="h-3 w-3" />
                {event.defaultLanguage.toUpperCase()} · {t('eventDetail.defaultLanguage')}
              </span>
              {(event.defaultLanguage === 'pl' ? ['EN'] : ['PL']).map((l) => (
                <span key={l} className="inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/40 px-2.5 py-1 text-xs text-slate-400">
                  {l}
                </span>
              ))}
            </div>
          </Card>

          {/* Client access — agency manages which client accounts may open this event */}
          {isClient ? (
            <Card>
              <SectionHeader icon="users" title={t('eventDetail.clientContact')} />
              {event.clientEmail ? (
                <a
                  href={`mailto:${event.clientEmail}`}
                  className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 transition hover:border-indigo-400/40 hover:bg-slate-900"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                    {event.clientEmail.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white group-hover:text-indigo-200">{event.clientEmail}</p>
                  </div>
                  <Icon name="externalLink" className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-300" />
                </a>
              ) : (
                <EmptyBlock icon="users" title={t('eventDetail.noClient')} />
              )}
            </Card>
          ) : (
            <ClientAccessCard eventId={eventId} clientEmail={event.clientEmail} />
          )}

          {/* Created / updated */}
          <Card>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between">
                <span className="text-slate-500">{t('eventDetail.created')}</span>
                <span className="text-slate-300">{new Date(event.createdAt).toLocaleString(i18n.language)}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-500">{t('eventDetail.updated')}</span>
                <span className="text-slate-300">
                  {event.updatedAt ? new Date(event.updatedAt).toLocaleString(i18n.language) : t('eventDetail.never')}
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============ Helpers ============

function ClientAccessCard({ eventId, clientEmail }: { eventId: string; clientEmail: string | null }) {
  const { t } = useTranslation()
  const { data: clients } = useClients()
  const { data: assignedIds } = useEventClients(eventId)
  const setClients = useSetEventClients(eventId)

  const assigned = new Set(assignedIds ?? [])
  const list = clients ?? []

  async function toggle(clientId: string) {
    const next = new Set(assigned)
    if (next.has(clientId)) next.delete(clientId)
    else next.add(clientId)
    await setClients.mutateAsync([...next])
  }

  // A legacy free-text contact e-mail that isn't one of the real client accounts.
  const legacyOnly =
    clientEmail && !list.some((c) => c.email.toLowerCase() === clientEmail.toLowerCase())

  return (
    <Card>
      <SectionHeader icon="users" title={t('eventDetail.clientAccess')} />
      <p className="-mt-2 mb-3 text-xs text-slate-400">{t('eventDetail.clientAccessHint')}</p>

      {list.length === 0 ? (
        <div className="space-y-2">
          <EmptyBlock icon="users" title={t('eventDetail.clientAccessNoAccounts')} />
          <Link
            to="/team"
            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 transition hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white"
          >
            <Icon name="users" className="h-3.5 w-3.5" /> {t('eventDetail.clientAccessManageTeam')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((c) => {
            const on = assigned.has(c.id)
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => void toggle(c.id)}
                  disabled={setClients.isPending}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition disabled:opacity-60 ${
                    on
                      ? 'border-indigo-400/50 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ${
                      on ? 'from-indigo-500 to-violet-500' : 'from-slate-600 to-slate-700'
                    }`}
                  >
                    {c.displayName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{c.displayName}</p>
                    <p className="truncate text-xs text-slate-500">{c.email}</p>
                  </div>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ${
                      on ? 'bg-indigo-500 text-white ring-indigo-400' : 'bg-slate-900 text-transparent ring-slate-700'
                    }`}
                  >
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {legacyOnly && (
        <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-200/80">
          {t('eventDetail.clientAccessLegacy', { email: clientEmail })}
        </p>
      )}
    </Card>
  )
}

function PhaseChip({ phase }: { phase: 'upcoming' | 'live' | 'ended' }) {
  const { t } = useTranslation()
  const m = {
    upcoming: { label: t('dashboard.untilStart'), cls: 'bg-amber-400/15 text-amber-300 ring-amber-400/30', dot: 'bg-amber-400', pulse: false },
    live: { label: t('dashboard.happeningNow'), cls: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30', dot: 'bg-emerald-400', pulse: true },
    ended: { label: t('dashboard.ended'), cls: 'bg-slate-400/10 text-slate-300 ring-slate-400/20', dot: 'bg-slate-400', pulse: false },
  }[phase]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${m.cls}`}>
      <span className="relative flex h-1.5 w-1.5">
        {m.pulse && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${m.dot} opacity-75`} />}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${m.dot}`} />
      </span>
      {m.label}
    </span>
  )
}

function StatusChip({ status }: { status: number }) {
  const m: Record<number, { label: string; cls: string }> = {
    [EventStatus.Draft]: { label: 'Draft', cls: 'bg-amber-400/15 text-amber-300 ring-amber-400/30' },
    [EventStatus.Published]: { label: 'Published', cls: 'bg-sky-400/15 text-sky-300 ring-sky-400/30' },
    [EventStatus.Live]: { label: 'Live', cls: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30' },
    [EventStatus.Completed]: { label: 'Completed', cls: 'bg-violet-400/15 text-violet-300 ring-violet-400/30' },
    [EventStatus.Archived]: { label: 'Archived', cls: 'bg-slate-400/10 text-slate-300 ring-slate-400/20' },
  }
  const cur = m[status] ?? m[EventStatus.Draft]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${cur.cls}`}>
      {cur.label}
    </span>
  )
}

function InfoBit({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon name={icon} className="h-3.5 w-3.5 text-slate-500" />
      {children}
    </span>
  )
}

function SectionHeader({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/60 ring-1 ring-inset ring-indigo-400/30">
        <Icon name={icon} className="h-3.5 w-3.5 text-indigo-200" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="text-sm text-slate-100">{children}</p>
    </div>
  )
}

function MiniStat({
  icon,
  accent,
  label,
  value,
  to,
}: {
  icon: IconName
  accent: 'violet' | 'sky' | 'indigo' | 'amber'
  label: string
  value: number
  to: string
}) {
  const a = {
    violet: { halo: 'from-violet-500/30 to-fuchsia-500/10', ring: 'ring-violet-400/30', text: 'text-violet-200' },
    sky: { halo: 'from-sky-500/30 to-cyan-500/10', ring: 'ring-sky-400/30', text: 'text-sky-200' },
    indigo: { halo: 'from-indigo-500/30 to-violet-500/10', ring: 'ring-indigo-400/30', text: 'text-indigo-200' },
    amber: { halo: 'from-amber-500/30 to-orange-500/10', ring: 'ring-amber-400/30', text: 'text-amber-200' },
  }[accent]
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4 backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-400/40"
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${a.halo} blur-2xl`} />
      <div className="relative flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950/60 ring-1 ring-inset ${a.ring} ${a.text}`}>
          <Icon name={icon} className="h-4 w-4" />
        </div>
      </div>
      <p className="relative mt-2 text-3xl font-bold tabular-nums tracking-tight text-white">{value}</p>
    </Link>
  )
}

function CopyableUrl({ url }: { url: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignored
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 p-2">
      <code className="flex-1 truncate font-mono text-xs text-slate-300">{url}</code>
      <button
        onClick={copy}
        className="rounded-md border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-[11px] font-medium text-slate-200 transition hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white"
      >
        {copied ? '✓ ' + t('eventDetail.copied') : '⎘ ' + t('eventDetail.copy')}
      </button>
    </div>
  )
}

function BrandingPreview({
  branding,
  t,
}: {
  branding: { primaryColor: string; accentColor: string; logoUrl: string | null }
  t: (k: string) => string
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <ColorSwatch label={t('eventDetail.primaryColor')} color={branding.primaryColor} />
        <ColorSwatch label={t('eventDetail.accentColor')} color={branding.accentColor} />
      </div>
      <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{t('eventDetail.logo')}</p>
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt="" className="h-10 w-auto rounded bg-white/5 object-contain p-1" />
        ) : (
          <p className="text-xs text-slate-500">{t('eventDetail.noLogo')}</p>
        )}
      </div>
      <div
        className="h-8 rounded-lg"
        style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.accentColor})` }}
        title="preview"
      />
    </div>
  )
}

function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <div className="flex items-center gap-2">
        <span className="h-6 w-6 rounded-md ring-1 ring-inset ring-white/10" style={{ background: color }} />
        <code className="font-mono text-[11px] text-slate-300">{color}</code>
      </div>
    </div>
  )
}

function EmptyBlock({
  icon,
  title,
  subtitle,
  cta,
}: {
  icon: IconName
  title: string
  subtitle?: string
  cta?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-700/60 bg-slate-950/30 px-4 py-6 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800/60 text-slate-500">
        <Icon name={icon} className="h-4 w-4" />
      </div>
      <p className="mt-2 text-sm font-medium text-slate-300">{title}</p>
      {subtitle && <p className="mt-1 max-w-[240px] text-xs text-slate-500">{subtitle}</p>}
      {cta && <p className="mt-2 text-xs text-indigo-300">{cta}</p>}
    </div>
  )
}

