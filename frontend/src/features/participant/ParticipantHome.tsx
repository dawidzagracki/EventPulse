import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { assetUrl } from '../../lib/api'
import {
  useAddCompanion,
  useCompleteOnboarding,
  useDeleteCompanion,
  useMyAgenda,
  useMyBranding,
  useMyCompanions,
  useMyCustomFields,
  useMyEvent,
  useMyOnboarding,
  useMyProfile,
  useMyTransfers,
  useRsvp,
  useSaveMyCustomFields,
  useSubmitFeedback,
  useUpdateConsents,
  useUpdatePreferences,
} from './api'
import { useAuthStore } from '../../stores/authStore'
import { Button, Card, Field, Input } from '../../components/ui'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Logo } from '../../components/Logo'
import {
  AgendaItemTypeName,
  CustomFieldType,
  type CustomFieldDto,
  type MyProfileDto,
  type OnboardingStepDto,
  type QuizTakeDto,
} from '../../types/api'
import { getQuizTake, submitQuiz, useAddContact, useMyContacts, useMyQuizzes } from '../engagement/api'
import { recordStationScan } from './api'
import { useBrandTheme } from './theme'
import { startQrScanner, type QrScanHandle } from '../../lib/qrScanner'
import { createQuizConnection } from '../../lib/signalr'
import { useMyGallery } from '../gallery/api'
import { fetchPhotoUrl } from '../gallery/api'
import { Thumb } from '../gallery/Thumb'
import { AiAssistantSection } from '../ai/AiAssistantSection'

type Tab = 'agenda' | 'qr' | 'activities' | 'gallery' | 'profile'

// Module-scope clock read keeps component bodies "pure" for the linter.
const nowMs = () => Date.now()

export function ParticipantHome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const { data: profile, isLoading } = useMyProfile()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">{t('common.loading')}</p>
      </div>
    )
  }

  // Hard gate: GDPR consent must be accepted before any personal data is shown.
  if (!profile.hasAcceptedRodo) {
    return <RodoGate key={`gate-${profile.id}`} profile={profile} onLogout={handleLogout} />
  }

  return <ParticipantShell profile={profile} onLogout={handleLogout} />
}

// Shows the custom onboarding (if any, not yet completed) before the main app.
function ParticipantShell({ profile, onLogout }: { profile: MyProfileDto; onLogout: () => void }) {
  const { t } = useTranslation()
  const { data: steps, isLoading } = useMyOnboarding()
  const { data: fields } = useMyCustomFields()
  const complete = useCompleteOnboarding()
  const saveFields = useSaveMyCustomFields()

  if (isLoading || steps === undefined || fields === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">{t('common.loading')}</p>
      </div>
    )
  }

  // The onboarding gate now also collects the custom form, so it fires whenever
  // there are info steps OR custom fields to fill — right after login, mandatory.
  const needsOnboarding = !profile.onboardingCompleted && (steps.length > 0 || fields.length > 0)
  if (needsOnboarding) {
    return (
      <OnboardingGate
        steps={steps}
        fields={fields}
        initialValues={profile.customFields}
        onFinish={async (values) => {
          if (fields.length > 0) await saveFields.mutateAsync(values)
          await complete.mutateAsync()
        }}
        onLogout={onLogout}
      />
    )
  }

  return <ParticipantApp profile={profile} onLogout={onLogout} />
}

// ===================== Tabbed app shell =====================
function ParticipantApp({ profile, onLogout }: { profile: MyProfileDto; onLogout: () => void }) {
  const { t } = useTranslation()
  const { data: ev } = useMyEvent()
  const { data: branding } = useMyBranding()
  const [tab, setTab] = useState<Tab>('agenda')
  const [liveQuizId, setLiveQuizId] = useState<string | null>(null)
  const announced = useLiveQuizAnnounce(profile.eventId)

  function joinAnnouncedQuiz() {
    if (!announced) return
    setLiveQuizId(announced.quizId)
    setTab('activities')
  }

  // Tabs the organiser can hide per event (default visible). QR + Profile always stay.
  const allTabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'agenda', label: t('participant.tabAgenda'), emoji: '📅' },
    { id: 'activities', label: t('participant.tabActivities'), emoji: '🎯' },
    { id: 'qr', label: t('participant.tabQr'), emoji: '🎟' },
    { id: 'gallery', label: t('participant.tabGallery'), emoji: '📸' },
    { id: 'profile', label: t('participant.tabProfile'), emoji: '👤' },
  ]
  const tabs = allTabs.filter((tb) => {
    if (tb.id === 'agenda') return ev?.showAgendaTab !== false
    if (tb.id === 'activities') return ev?.showActivitiesTab !== false
    if (tb.id === 'gallery') return ev?.showGalleryTab !== false
    return true
  })

  // Never leave a hidden tab active (e.g. agenda hidden while it's the default).
  const activeTab: Tab = tabs.some((tb) => tb.id === tab) ? tab : (tabs[0]?.id ?? 'qr')
  // The public page is live exactly when the PAGE is published (matches the public slug route) —
  // the event status alone is irrelevant here.
  const publicUrl = ev?.slug && branding?.hasPublishedPage ? `/public/${ev.slug}` : null
  // Optional per-event theming: the organiser can repaint the WHOLE app with the brand colours.
  const theme = useBrandTheme()
  const accent = theme?.accent

  return (
    <div className="min-h-screen pb-24" style={theme ? { background: theme.appBg } : undefined}>
      {/* Slim header — event logo (on a light plate so dark logos stay visible) + names */}
      <header
        className="sticky top-0 z-10 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur"
        style={theme ? { borderBottomColor: theme.accent, background: theme.barBg } : undefined}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {branding?.logoUrl ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1 shadow-sm ring-1 ring-inset ring-slate-300/30">
                <img src={assetUrl(branding.logoUrl) ?? undefined} alt="" className="max-h-full max-w-full object-contain" />
              </span>
            ) : (
              <Logo size={26} />
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight text-white">{ev?.name ?? ''}</span>
              {ev?.companyName && (
                <span className="block truncate text-[11px] leading-tight text-slate-400">{ev.companyName}</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={t('participant.viewPage')}
                className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
              >
                🌐
              </a>
            )}
            <LanguageSwitcher />
            <Button variant="ghost" onClick={onLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      {/* Live-quiz join banner — appears when a host starts a quiz at this event. */}
      {announced && liveQuizId !== announced.quizId && (
        <button
          onClick={joinAnnouncedQuiz}
          className="sticky top-[57px] z-20 flex w-full items-center gap-3 border-b border-rose-400/30 bg-gradient-to-r from-rose-600 to-fuchsia-600 px-4 py-3 text-left text-white shadow-lg"
        >
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">{t('participant.liveQuizBannerLabel')}</span>
            <span className="block truncate text-sm font-bold">{announced.title}</span>
          </span>
          <span className="shrink-0 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold">{t('participant.liveQuizJoin')} →</span>
        </button>
      )}

      <main className="mx-auto max-w-2xl px-4 py-5">
        {activeTab === 'agenda' && (
          <div className="space-y-5">
            <GreetingHero profile={profile} />
            <EventSummaryCard />
            {/* Visible tile leading to the public event page (not just the small 🌐 icon). */}
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-gradient-to-r from-sky-500/15 to-indigo-500/10 p-4 transition hover:border-sky-400/40"
                style={theme ? { background: theme.heroBg, borderColor: theme.border } : undefined}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-lg"
                  style={theme ? { background: theme.accentSoft } : undefined}
                >🌐</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{t('participant.pageTileTitle')}</span>
                  <span className="block truncate text-xs text-slate-400">{t('participant.pageTileHint')}</span>
                </span>
                <span className="shrink-0 text-slate-400">→</span>
              </a>
            )}
            <AgendaSection />
          </div>
        )}
        {activeTab === 'activities' && (
          <div className="space-y-5">
            <StationScanSection />
            <QuizzesSection liveQuizId={liveQuizId} setLiveQuizId={setLiveQuizId} />
            <NetworkingSection />
            <AiAssistantSection />
            <FeedbackSection />
          </div>
        )}
        {activeTab === 'qr' && <MyQrScreen profile={profile} />}
        {activeTab === 'gallery' && <GallerySection />}
        {activeTab === 'profile' && (
          <div className="space-y-5">
            {ev?.showPreferencesTile !== false && (
              <PreferencesSection
                key={`prefs-${profile.id}`}
                profile={profile}
                showShirt={ev?.showShirtSize !== false}
              />
            )}
            <CompanionsSection />
            <CustomFieldsSection />
            <LogisticsSection profile={profile} />
            <ConsentsSection key={`consents-${profile.id}`} profile={profile} />
          </div>
        )}
      </main>

      {/* Bottom nav — tinted with the brand colour when the theme is on */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800/70 bg-slate-950/85 backdrop-blur-xl"
        style={theme ? { background: theme.barBg, borderTopColor: theme.border } : undefined}
      >
        <div className="mx-auto flex max-w-2xl items-stretch">
          {tabs.map((tb) => {
            const active = activeTab === tb.id
            const isQr = tb.id === 'qr'
            return (
              <button
                key={tb.id}
                onClick={() => setTab(tb.id)}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-2.5"
              >
                {isQr ? (
                  <span
                    className={`-mt-6 flex h-12 w-12 items-center justify-center rounded-full text-xl shadow-lg transition ${
                      active
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-violet-500/40 ring-4 ring-slate-950'
                        : 'bg-slate-800 text-slate-300 ring-4 ring-slate-950'
                    }`}
                    style={active && accent ? { background: accent } : undefined}
                  >
                    {tb.emoji}
                  </span>
                ) : (
                  <span className={`text-lg transition ${active ? 'scale-110' : 'opacity-60'}`}>{tb.emoji}</span>
                )}
                <span
                  className={`text-[10px] font-medium ${active ? 'text-indigo-300' : 'text-slate-500'}`}
                  style={active && accent ? { color: accent } : undefined}
                >
                  {tb.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// ===================== Greeting + What's next =====================
function GreetingHero({ profile }: { profile: MyProfileDto }) {
  const { t, i18n } = useTranslation()
  const { data: items } = useMyAgenda()
  const { data: ev } = useMyEvent()
  const theme = useBrandTheme()
  const isEn = (i18n.resolvedLanguage ?? 'pl') === 'en'

  const now = nowMs()
  const next = (items ?? [])
    .filter((it) => new Date(it.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0]

  const seat = profile.tableName || profile.roomNumber

  return (
    <div
      className="overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-transparent p-5"
      style={theme ? { background: theme.heroBg, borderColor: theme.border } : undefined}
    >
      {/* Which event this app is about — always visible up top. */}
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80" style={theme ? { color: theme.accent } : undefined}>
        {ev?.name ?? t('dashboard.live')}
        {ev?.companyName ? ` · ${ev.companyName}` : ''}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-white">{t('participant.hello', { name: profile.firstName })}</h1>

      <RsvpRow profile={profile} />

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {/* What's next */}
        <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
            {t('participant.whatsNext')}
          </p>
          {next ? (
            <>
              <p className="mt-1 truncate text-sm font-semibold text-white">{isEn ? next.titleEn : next.titlePl}</p>
              <p className="text-xs text-slate-400">
                {new Date(next.startsAt).toLocaleString(i18n.language, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                {next.locationName ? ` · ${next.locationName}` : ''}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-500">{t('participant.noNext')}</p>
          )}
        </div>

        {/* Seat */}
        {seat && (
          <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              {t('participant.yourSeat')}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {profile.tableName && `${t('logistics.table')}: ${profile.tableName}`}
              {profile.tableName && profile.roomNumber ? ' · ' : ''}
              {profile.roomNumber && `${t('logistics.room')}: ${profile.roomNumber}`}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ===================== Mini event summary (in-app) =====================
function EventSummaryCard() {
  const { t, i18n } = useTranslation()
  const { data: ev } = useMyEvent()
  const theme = useBrandTheme()
  if (!ev) return null

  const start = new Date(ev.startsAt)
  const end = new Date(ev.endsAt)
  const diffMs = start.getTime() - nowMs()
  const days = Math.floor(diffMs / 86_400_000)
  const hours = Math.floor((diffMs % 86_400_000) / 3_600_000)
  const live = ev.status === 2
  const countdown = live
    ? t('participant.evLiveNow')
    : diffMs <= 0
      ? t('participant.evStarted')
      : days >= 1
        ? t('participant.evInDays', { days })
        : t('participant.evInHours', { hours: Math.max(1, hours) })

  const sameDay = start.toDateString() === end.toDateString()
  const dateStr = sameDay
    ? `${start.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' })} · ${start.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`
    : `${start.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/50" style={theme ? { borderColor: theme.border } : undefined}>
      <div className="relative bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-fuchsia-500/10 p-5" style={theme ? { background: theme.heroBg } : undefined}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">{t('participant.evYourEvent')}</p>
            <h2 className="mt-1 truncate text-xl font-bold text-white">{ev.name}</h2>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${live ? 'bg-rose-500/15 text-rose-300 ring-rose-400/30' : 'bg-indigo-500/15 text-indigo-200 ring-indigo-400/30'}`}>
            {live && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400 align-middle" />}
            {countdown}
          </span>
        </div>
      </div>
      {/* Internal event status is deliberately NOT shown to guests. */}
      <div className="grid gap-px bg-slate-800/60 sm:grid-cols-2">
        <InfoCell label={t('participant.evWhen')} value={dateStr} />
        <InfoCell label={t('participant.evWhere')} value={ev.location || '—'} />
      </div>
      {ev.description && (
        <p className="border-t border-slate-800/60 bg-slate-950/30 px-5 py-3 text-sm text-slate-300">{ev.description}</p>
      )}
    </div>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

// ===================== Station scanner (guest) =====================
// Extract a station code from scanned QR text. Accepts "station:CODE",
// a URL with ?station=CODE, or treats the whole trimmed text as the code.
function parseStationCode(raw: string): string {
  const t = raw.trim()
  const prefix = t.match(/^station:(.+)$/i)
  if (prefix) return prefix[1].trim()
  try {
    const u = new URL(t)
    const q = u.searchParams.get('station')
    if (q) return q
  } catch {
    /* not a URL */
  }
  return t
}

function StationScanSection() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<{ name: string; dup: boolean; limit?: boolean; notAllowed?: boolean } | null>(null)
  const [camOk, setCamOk] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    if (!open || !videoRef.current) return
    let cancelled = false
    let handle: QrScanHandle | undefined

    const onResult = async (raw: string) => {
      if (busyRef.current) return
      busyRef.current = true
      const code = parseStationCode(raw)
      try {
        const r = await recordStationScan(code)
        setResult({ name: r.stationCode, dup: r.duplicate, limit: r.limitReached, notAllowed: r.allowed === false })
        setOpen(false)
      } finally {
        window.setTimeout(() => (busyRef.current = false), 1500)
      }
    }

    void startQrScanner(videoRef.current, (raw) => void onResult(raw), (s) => setCamOk(s === 'on')).then((h) => {
      if (cancelled) h.stop()
      else handle = h
    })
    return () => {
      cancelled = true
      handle?.stop()
    }
  }, [open])

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-white">{t('participant.stationScan')}</h2>
      <p className="mb-3 text-sm text-slate-400">{t('participant.stationScanHint')}</p>

      {result && (
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            result.limit || result.notAllowed
              ? 'bg-rose-400/15 text-rose-300'
              : result.dup
                ? 'bg-amber-400/15 text-amber-300'
                : 'bg-emerald-400/15 text-emerald-300'
          }`}
        >
          {result.limit
            ? t('participant.stationLimit')
            : result.notAllowed
              ? t('participant.stationNotAllowed')
              : result.dup
                ? t('participant.stationScanDup')
                : t('participant.stationScanned', { name: result.name })}
        </p>
      )}

      {!open ? (
        <Button onClick={() => { setResult(null); setOpen(true) }}>
          📷 {t('participant.stationScanOpen')}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
            {camOk && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-2xl border-2 border-white/70" />
              </div>
            )}
            {camOk === false && (
              <div className="flex aspect-square w-full items-center justify-center p-6 text-center text-sm text-slate-400">
                {t('participant.stationCamUnavailable')}
              </div>
            )}
          </div>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('participant.stationScanClose')}
          </Button>
        </div>
      )}
    </Card>
  )
}

// ===================== RSVP row =====================
function RsvpRow({ profile }: { profile: MyProfileDto }) {
  const { t } = useTranslation()
  const rsvp = useRsvp()
  // 2 = Confirmed, 3 = Declined.
  const confirmed = profile.status === 2
  const declined = profile.status === 3
  const decided = confirmed || declined

  if (decided) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800/70 bg-slate-950/40 px-3 py-2">
        <span className={`text-sm font-medium ${confirmed ? 'text-emerald-300' : 'text-slate-400'}`}>
          {confirmed ? t('participant.rsvpConfirmed') : t('participant.rsvpDeclined')}
        </span>
        <button
          onClick={() => rsvp.mutate(!confirmed)}
          disabled={rsvp.isPending}
          className="ml-auto text-xs text-indigo-300 underline-offset-2 hover:underline disabled:opacity-50"
        >
          {t('participant.rsvpChange')}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3">
      <p className="mb-2 text-sm font-medium text-white">{t('participant.rsvpQuestion')}</p>
      <div className="flex gap-2">
        <button
          onClick={() => rsvp.mutate(true)}
          disabled={rsvp.isPending}
          className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:opacity-95 disabled:opacity-50"
        >
          ✓ {t('participant.rsvpYes')}
        </button>
        <button
          onClick={() => rsvp.mutate(false)}
          disabled={rsvp.isPending}
          className="flex-1 rounded-lg border border-slate-700/60 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-rose-400/40 hover:text-rose-300 disabled:opacity-50"
        >
          {t('participant.rsvpNo')}
        </button>
      </div>
    </div>
  )
}

// ===================== My QR screen =====================
function MyQrScreen({ profile }: { profile: MyProfileDto }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [bright, setBright] = useState(false)

  useEffect(() => {
    let revoke: string | null = null
    let active = true
    fetchPhotoUrl('/api/me/qr')
      .then((u) => {
        if (active) {
          revoke = u
          setUrl(u)
        } else {
          URL.revokeObjectURL(u)
        }
      })
      .catch(() => {
        /* keep null → spinner */
      })
    return () => {
      active = false
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [])

  return (
    <div className="flex flex-col items-center pt-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">{t('participant.myQrTitle')}</p>
      <h2 className="mt-1 text-xl font-bold text-white">
        {profile.firstName} {profile.lastName}
      </h2>
      <p className="mt-1 text-sm text-slate-400">{t('participant.myQrHint')}</p>

      <div
        className={`mt-6 rounded-3xl p-5 shadow-2xl transition-all ${
          bright ? 'bg-white shadow-white/30' : 'bg-white/95'
        }`}
        style={bright ? { boxShadow: '0 0 80px 20px rgba(255,255,255,0.35)' } : undefined}
      >
        {url ? (
          <img src={url} alt="QR" className="h-60 w-60 object-contain sm:h-72 sm:w-72" />
        ) : (
          <div className="flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        )}
      </div>

      <button
        onClick={() => setBright((v) => !v)}
        className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
          bright
            ? 'bg-amber-400 text-slate-900 shadow-lg shadow-amber-400/30'
            : 'border border-slate-700/60 bg-slate-900/60 text-slate-200 hover:border-amber-400/40'
        }`}
      >
        ☀️ {bright ? t('participant.brightenOn') : t('participant.brighten')}
      </button>
    </div>
  )
}

// ===================== RODO gate (full screen, friendly) =====================
/**
 * Brand strip above the welcome gates (consents/onboarding): client logo on a light
 * plate (contrast-safe for dark logos) + event name + client company name.
 */
function GateBrandHeader({ onLogout }: { onLogout: () => void }) {
  const { t } = useTranslation()
  const { data: ev } = useMyEvent()
  const { data: branding } = useMyBranding()
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        {branding?.logoUrl ? (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-slate-300/30">
            <img src={assetUrl(branding.logoUrl) ?? undefined} alt="" className="max-h-full max-w-full object-contain" />
          </span>
        ) : (
          <Logo size={32} />
        )}
        <span className="min-w-0">
          {ev?.name && <span className="block truncate text-sm font-bold leading-tight text-white">{ev.name}</span>}
          {ev?.companyName && (
            <span className="block truncate text-[11px] leading-tight text-slate-400">{ev.companyName}</span>
          )}
        </span>
      </div>
      <Button variant="ghost" onClick={onLogout}>
        {t('common.logout')}
      </Button>
    </div>
  )
}

function RodoGate({ profile, onLogout }: { profile: MyProfileDto; onLogout: () => void }) {
  const { t } = useTranslation()
  const update = useUpdateConsents()
  const { data: ev } = useMyEvent()
  const theme = useBrandTheme()
  const [rodo, setRodo] = useState(profile.hasAcceptedRodo)
  const [photo, setPhoto] = useState(profile.photoConsent)
  const [networking, setNetworking] = useState(profile.networkingConsent)
  const [phone, setPhone] = useState(profile.phone ?? '')

  const phoneRequired = ev?.phoneRequired ?? false
  const usesLocationData = ev?.usesLocationData ?? false
  const phoneMissing = phoneRequired && phone.trim().length === 0
  // The organiser can disable collecting the image consent for this event.
  const showPhotoConsent = ev?.showPhotoConsent !== false

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!rodo || phoneMissing) return
    await update.mutateAsync({
      rodoAccepted: rodo,
      // When the checkbox is hidden we don't collect this consent — keep the stored value.
      photoConsent: showPhotoConsent ? photo : profile.photoConsent,
      networkingConsent: networking,
      phone: phone.trim() || null,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={theme ? { background: theme.appBg } : undefined}>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl animate-pulse-slow" style={theme ? { background: theme.accentSoft } : undefined} />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl animate-pulse-slow [animation-delay:1.5s]" style={theme ? { background: theme.accentSoft } : undefined} />
      </div>

      <div className="w-full max-w-md">
        <GateBrandHeader onLogout={onLogout} />

        <Card glow>
          <div className="mb-4 flex items-center gap-3">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl text-white shadow-lg shadow-violet-500/30"
              style={theme ? { background: theme.btnBg } : undefined}
            >
              👋
            </span>
            <div>
              <h1 className="text-lg font-bold text-white">{t('participant.hello', { name: profile.firstName })}</h1>
              <p className="text-xs text-slate-400">{t('participant.rodoGateLead')}</p>
            </div>
          </div>

          <form onSubmit={save} className="space-y-2.5">
            <ConsentRow checked={rodo} onChange={setRodo} required label={t('participant.rodo')} />
            {showPhotoConsent && <ConsentRow checked={photo} onChange={setPhoto} label={t('participant.photo')} />}
            <ConsentRow checked={networking} onChange={setNetworking} label={t('participant.networking')} />

            <div className="pt-1">
              <Field label={phoneRequired ? `${t('participant.phone')} *` : t('participant.phoneOptional')}>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={t('participant.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </Field>
              {phoneMissing && <p className="mt-1 px-1 text-[11px] text-amber-300">{t('participant.phoneRequiredHint')}</p>}
            </div>

            {usesLocationData && (
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3">
                <p className="text-xs font-semibold text-sky-200">🔒 {t('participant.locationNoticeTitle')}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-sky-100/80">{t('participant.locationNotice')}</p>
              </div>
            )}

            {!rodo && <p className="px-1 text-[11px] text-amber-300">{t('participant.rodoRequired')}</p>}
            <Button
              type="submit"
              className="mt-2 w-full justify-center"
              disabled={!rodo || phoneMissing || update.isPending}
              style={theme ? { background: theme.btnBg } : undefined}
            >
              {t('participant.unlock')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}

function ConsentRow({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  required?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
        checked ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30'
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          checked ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600'
        }`}
      >
        {checked && '✓'}
      </span>
      <span className="text-sm text-slate-200">
        {label}
        {required && <span className="text-rose-400"> *</span>}
      </span>
    </button>
  )
}

// ===================== Custom onboarding (full screen, before the app) =====================
function OnboardingGate({
  steps,
  fields,
  initialValues,
  onFinish,
  onLogout,
}: {
  steps: OnboardingStepDto[]
  fields: CustomFieldDto[]
  initialValues: Record<string, string>
  onFinish: (values: Record<string, string>) => Promise<void>
  onLogout: () => void
}) {
  const { t, i18n } = useTranslation()
  const theme = useBrandTheme()
  const en = i18n.resolvedLanguage === 'en'
  const [idx, setIdx] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...initialValues }))
  const [submitting, setSubmitting] = useState(false)

  // Screens = the info steps, then one mandatory "form" screen if there are custom fields.
  const hasForm = fields.length > 0
  const total = steps.length + (hasForm ? 1 : 0)
  const onFormScreen = hasForm && idx === steps.length
  const step = onFormScreen ? null : steps[idx]
  const isLast = idx === total - 1

  const infoBlocked = !!step?.requireConfirm && !confirmed
  const formBlocked = onFormScreen && fields.some((f) => f.required && isEmptyAnswer(f, values[f.id]))
  const blocked = infoBlocked || formBlocked || submitting

  async function next() {
    if (blocked) return
    if (isLast) {
      setSubmitting(true)
      try {
        await onFinish(values)
      } finally {
        setSubmitting(false)
      }
      return
    }
    setIdx((i) => i + 1)
    setConfirmed(false)
  }

  const title = onFormScreen ? t('participant.formStepTitle') : (en && step!.titleEn) || step!.titlePl
  const body = onFormScreen ? null : (en ? step!.bodyEn : step!.bodyPl) ?? step!.bodyPl

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={theme ? { background: theme.appBg } : undefined}>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl animate-pulse-slow" style={theme ? { background: theme.accentSoft } : undefined} />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl animate-pulse-slow [animation-delay:1.5s]" style={theme ? { background: theme.accentSoft } : undefined} />
      </div>

      <div className="w-full max-w-md">
        <GateBrandHeader onLogout={onLogout} />

        <Card glow>
          {/* progress dots */}
          <div className="mb-4 flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition ${i <= idx ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-700'}`}
                style={theme && i <= idx ? { background: theme.btnBg } : undefined}
              />
            ))}
          </div>

          <h1 className="text-lg font-bold text-white">{title}</h1>
          {body && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-300">{body}</p>}

          {onFormScreen && (
            <div className="mt-4 space-y-3">
              {fields.map((f) => {
                const label = (en && f.labelEn) || f.labelPl
                return (
                  <Field key={f.id} label={f.required ? `${label} *` : label}>
                    <CustomFieldControl
                      field={f}
                      value={values[f.id] ?? ''}
                      onChange={(v) => setValues((vs) => ({ ...vs, [f.id]: v }))}
                    />
                  </Field>
                )
              })}
            </div>
          )}

          {step?.requireConfirm && (
            <button
              type="button"
              onClick={() => setConfirmed((v) => !v)}
              className={`mt-4 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                confirmed ? 'border-indigo-400/40 bg-indigo-500/10' : 'border-slate-800/70 bg-slate-900/40'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  confirmed ? 'border-indigo-400 bg-indigo-500 text-white' : 'border-slate-600'
                }`}
              >
                {confirmed && '✓'}
              </span>
              <span className="text-sm text-slate-200">{t('participant.onboardingConfirm')}</span>
            </button>
          )}

          <div className="mt-5 flex items-center gap-2">
            {idx > 0 && (
              <Button
                variant="subtle"
                onClick={() => {
                  setIdx((i) => i - 1)
                  setConfirmed(false)
                }}
              >
                {t('participant.onboardingBack')}
              </Button>
            )}
            <Button
              className="flex-1 justify-center"
              onClick={next}
              disabled={blocked}
              style={theme ? { background: theme.btnBg } : undefined}
            >
              {isLast ? t('participant.onboardingFinish') : t('participant.onboardingNext')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ===================== Accompanying persons (plus-ones) =====================
function CompanionsSection() {
  const { t } = useTranslation()
  const { data: ev } = useMyEvent()
  const { data: companions } = useMyCompanions()
  const add = useAddCompanion()
  const del = useDeleteCompanion()

  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [age, setAge] = useState('')
  const [qrId, setQrId] = useState<string | null>(null)

  if (!ev?.allowCompanions) return null

  const max = ev.maxCompanions
  const count = companions?.length ?? 0
  const atMax = max > 0 && count >= max

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!first.trim() || !last.trim()) return
    await add.mutateAsync({ firstName: first.trim(), lastName: last.trim(), age: age ? Number(age) : null })
    setFirst('')
    setLast('')
    setAge('')
  }

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold text-white">{t('companions.title')}</h2>
        <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
          {count}
          {max > 0 ? ` / ${max}` : ''}
        </span>
      </div>
      <p className="mb-3 text-sm text-slate-400">{t('companions.hint')}</p>

      <div className="space-y-2">
        {(companions ?? []).map((c) => (
          <div key={c.id} className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">
                  {c.firstName} {c.lastName}
                </p>
                {c.age != null && <p className="text-xs text-slate-500">{t('companions.ageLabel', { n: c.age })}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQrId(qrId === c.id ? null : c.id)}
                  className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
                >
                  {qrId === c.id ? t('companions.hideQr') : t('companions.showQr')}
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(t('companions.confirmRemove'))) del.mutate(c.id)
                  }}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/20"
                >
                  ✕
                </button>
              </div>
            </div>
            {qrId === c.id && <CompanionQr id={c.id} />}
          </div>
        ))}
      </div>

      {atMax ? (
        <p className="mt-3 text-xs text-amber-300">{t('companions.maxReached')}</p>
      ) : (
        <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_80px_auto]">
          <Input placeholder={t('companions.first')} value={first} onChange={(e) => setFirst(e.target.value)} />
          <Input placeholder={t('companions.last')} value={last} onChange={(e) => setLast(e.target.value)} />
          <Input type="number" min={0} max={120} placeholder={t('companions.age')} value={age} onChange={(e) => setAge(e.target.value)} />
          <Button type="submit" disabled={add.isPending || !first.trim() || !last.trim()}>
            +
          </Button>
        </form>
      )}
    </Card>
  )
}

function CompanionQr({ id }: { id: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let revoke: string | null = null
    void fetchPhotoUrl(`/api/me/companions/${id}/qr`).then((u) => {
      revoke = u
      setUrl(u)
    })
    return () => {
      if (revoke) URL.revokeObjectURL(revoke)
    }
  }, [id])

  return (
    <div className="mt-3 flex flex-col items-center rounded-xl bg-white p-4">
      {url ? <img src={url} alt="QR" className="h-44 w-44" /> : <div className="h-44 w-44 animate-pulse bg-slate-100" />}
      <p className="mt-2 text-xs font-medium text-slate-500">{t('companions.qrHint')}</p>
    </div>
  )
}

// ===================== Custom fields (participant profile) =====================
function CustomFieldsSection() {
  const { data: fields } = useMyCustomFields()
  const { data: profile } = useMyProfile()

  if (!fields || fields.length === 0 || !profile) return null
  return <CustomFieldsForm key={profile.id} fields={fields} initialValues={profile.customFields} />
}

/** Parse a multi-select answer (JSON array string) into a string[]. */
function parseStringArray(v: string | undefined): string[] {
  if (!v) return []
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** True when a required field has no meaningful answer (mirrors the server's check). */
function isEmptyAnswer(field: CustomFieldDto, v: string | undefined): boolean {
  if (!v || !v.trim()) return true
  if (field.type === CustomFieldType.MultiSelect) return parseStringArray(v).length === 0
  return false
}

/** Renders a single custom-field input. Shared by the Profile form and the onboarding gate. */
function CustomFieldControl({
  field,
  value,
  onChange,
}: {
  field: CustomFieldDto
  value: string
  onChange: (v: string) => void
}) {
  const { t } = useTranslation()
  const cls = 'w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100'

  if (field.type === CustomFieldType.Textarea) {
    return <textarea className={cls} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
  }
  if (field.type === CustomFieldType.Checkbox) {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-200">
        <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : 'false')} />
        {t('common.yes')}
      </label>
    )
  }
  if (field.type === CustomFieldType.Select) {
    return (
      <select className={cls} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    )
  }
  if (field.type === CustomFieldType.MultiSelect) {
    const selected = parseStringArray(value)
    // Options prefixed with "!" are EXCLUSIVE (e.g. "!Nie potrzebuję transportu"):
    // picking one clears everything else, and picking anything else clears it.
    const opts = field.options.map((raw) => ({
      raw,
      label: raw.startsWith('!') ? raw.slice(1).trim() : raw,
      exclusive: raw.startsWith('!'),
    }))
    const exclusiveLabels = new Set(opts.filter((o) => o.exclusive).map((o) => o.label))
    const toggle = (opt: { label: string; exclusive: boolean }) => {
      const set = new Set(selected)
      if (set.has(opt.label)) {
        set.delete(opt.label)
      } else if (opt.exclusive) {
        set.clear()
        set.add(opt.label)
      } else {
        for (const ex of exclusiveLabels) set.delete(ex)
        set.add(opt.label)
      }
      onChange(JSON.stringify([...set]))
    }
    const exclusiveActive = selected.some((s) => exclusiveLabels.has(s))
    return (
      <div className="space-y-1.5">
        {opts.map((o) => {
          const checked = selected.includes(o.label)
          const dimmed = exclusiveActive && !checked
          return (
            <label
              key={o.raw}
              className={`flex items-center gap-2 text-sm text-slate-200 ${dimmed ? 'opacity-50' : ''}`}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(o)} />
              {o.label}
            </label>
          )
        })}
      </div>
    )
  }
  return <Input value={value} onChange={(e) => onChange(e.target.value)} />
}

function CustomFieldsForm({
  fields,
  initialValues,
}: {
  fields: CustomFieldDto[]
  initialValues: Record<string, string>
}) {
  const { t, i18n } = useTranslation()
  const save = useSaveMyCustomFields()
  const en = i18n.resolvedLanguage === 'en'

  const [values, setValues] = useState<Record<string, string>>(() => ({ ...initialValues }))
  const set = (id: string, v: string) => setValues((vs) => ({ ...vs, [id]: v }))

  async function persist(e: React.FormEvent) {
    e.preventDefault()
    await save.mutateAsync(values)
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('participant.customFields')}</h2>
      <form onSubmit={persist} className="space-y-3">
        {fields.map((f: CustomFieldDto) => {
          const label = (en && f.labelEn) || f.labelPl
          return (
            <Field key={f.id} label={f.required ? `${label} *` : label}>
              <CustomFieldControl field={f} value={values[f.id] ?? ''} onChange={(v) => set(f.id, v)} />
            </Field>
          )
        })}
        <Button type="submit" disabled={save.isPending}>
          {t('common.save')}
        </Button>
        {save.isSuccess && <span className="ml-3 text-sm text-emerald-400">✓</span>}
      </form>
    </Card>
  )
}

// ===================== Existing sections (reused) =====================
function ConsentsSection({ profile }: { profile: MyProfileDto }) {
  const { t } = useTranslation()
  const update = useUpdateConsents()
  const { data: ev } = useMyEvent()

  const [rodo, setRodo] = useState(profile.hasAcceptedRodo)
  const [photo, setPhoto] = useState(profile.photoConsent)
  const [networking, setNetworking] = useState(profile.networkingConsent)
  const [phone, setPhone] = useState(profile.phone ?? '')

  const phoneRequired = ev?.phoneRequired ?? false
  const phoneMissing = phoneRequired && phone.trim().length === 0
  const showPhotoConsent = ev?.showPhotoConsent !== false

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (phoneMissing) return
    await update.mutateAsync({
      rodoAccepted: rodo,
      photoConsent: showPhotoConsent ? photo : profile.photoConsent,
      networkingConsent: networking,
      phone: phone.trim() || null,
    })
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('participant.consents')}</h2>
      <form onSubmit={save} className="space-y-2.5">
        <ConsentRow checked={rodo} onChange={setRodo} required label={t('participant.rodo')} />
        {showPhotoConsent && <ConsentRow checked={photo} onChange={setPhoto} label={t('participant.photo')} />}
        <ConsentRow checked={networking} onChange={setNetworking} label={t('participant.networking')} />
        <Field label={phoneRequired ? `${t('participant.phone')} *` : t('participant.phoneOptional')}>
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('participant.phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        {phoneMissing && <p className="px-1 text-[11px] text-amber-300">{t('participant.phoneRequiredHint')}</p>}
        <Button type="submit" disabled={!rodo || phoneMissing || update.isPending}>
          {t('common.save')}
        </Button>
      </form>
    </Card>
  )
}

// Structured options. Values are the canonical Polish labels actually stored on the
// participant record, so admin views (scan feedback, lists) stay readable.
const DIET_OPTIONS = ['Standardowa', 'Wegetariańska', 'Wegańska', 'Bezglutenowa', 'Bez laktozy', 'Koszerna', 'Halal']
const SHIRT_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

function PreferencesSection({ profile, showShirt = true }: { profile: MyProfileDto; showShirt?: boolean }) {
  const { t, i18n } = useTranslation()
  const update = useUpdatePreferences()

  const [language, setLanguage] = useState(profile.language)
  // Diet: a dropdown of presets + an "Inne" escape hatch with a free-text box.
  const initialDiet = profile.dietaryPreferences ?? ''
  const initialDietIsPreset = initialDiet === '' || DIET_OPTIONS.includes(initialDiet)
  const [dietChoice, setDietChoice] = useState(initialDietIsPreset ? initialDiet : 'Inne')
  const [dietOther, setDietOther] = useState(initialDietIsPreset ? '' : initialDiet)
  const [shirt, setShirt] = useState(profile.shirtSize ?? '')
  const [wishes, setWishes] = useState(profile.wishes ?? '')
  const [transfer, setTransfer] = useState(profile.airportTransfer)
  const [arrival, setArrival] = useState(profile.arrivalTime ?? '')
  const [flight, setFlight] = useState(profile.flightNumber ?? '')

  const dietary = dietChoice === 'Inne' ? dietOther.trim() : dietChoice

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await update.mutateAsync({
      language,
      dietaryPreferences: dietary || null,
      shirtSize: shirt || null,
      wishes: wishes || null,
      airportTransfer: transfer,
      arrivalTime: arrival || null,
      flightNumber: flight || null,
    })
    void i18n.changeLanguage(language)
  }

  // A custom shirt value (legacy import) stays selectable.
  const shirtOptions = shirt && !SHIRT_OPTIONS.includes(shirt) ? [shirt, ...SHIRT_OPTIONS] : SHIRT_OPTIONS
  const selectCls =
    'w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100'

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('participant.preferences')}</h2>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label={t('participant.language')}>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className={selectCls}>
            <option value="pl">PL</option>
            <option value="en">EN</option>
          </select>
        </Field>
        <Field label={t('participant.dietary')}>
          <select value={dietChoice} onChange={(e) => setDietChoice(e.target.value)} className={selectCls}>
            <option value="">{t('participant.dietNone')}</option>
            {DIET_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
            <option value="Inne">{t('participant.dietOther')}</option>
          </select>
        </Field>
        {dietChoice === 'Inne' && (
          <div className="sm:col-span-2">
            <Input
              value={dietOther}
              onChange={(e) => setDietOther(e.target.value)}
              placeholder={t('participant.dietOtherPlaceholder')}
            />
          </div>
        )}
        {showShirt && (
          <Field label={t('participant.shirt')}>
            <select value={shirt} onChange={(e) => setShirt(e.target.value)} className={selectCls}>
              <option value="">{t('participant.shirtNone')}</option>
              {shirtOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}
        <label className="flex items-center gap-2 self-end text-sm text-slate-200">
          <input type="checkbox" checked={transfer} onChange={(e) => setTransfer(e.target.checked)} />
          {t('participant.transfer')}
        </label>
        {transfer && (
          <>
            <Field label={t('participant.arrival')}>
              <Input value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="14:30" />
            </Field>
            <Field label={t('participant.flight')}>
              <Input value={flight} onChange={(e) => setFlight(e.target.value)} placeholder="LO245" />
            </Field>
          </>
        )}
        <div className="sm:col-span-2">
          <Field label={t('participant.wishes')}>
            <Input value={wishes} onChange={(e) => setWishes(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={update.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function LogisticsSection({ profile }: { profile: MyProfileDto }) {
  const { t } = useTranslation()
  const { data: transfers } = useMyTransfers()

  const hasInfo = profile.tableName || profile.roomNumber || profile.hotelName
  if (!hasInfo && (!transfers || transfers.length === 0)) {
    return null
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('logistics.title')}</h2>
      <div className="space-y-1 text-sm text-slate-200">
        {profile.tableName && (
          <p>
            <span className="text-slate-500">{t('logistics.table')}:</span> {profile.tableName}
          </p>
        )}
        {profile.roomNumber && (
          <p>
            <span className="text-slate-500">{t('logistics.room')}:</span> {profile.roomNumber}
            {profile.hotelName ? ` · ${profile.hotelName}` : ''}
            {profile.hotelAddress ? ` · ${profile.hotelAddress}` : ''}
          </p>
        )}
        {profile.hotelPhone && (
          <p>
            <span className="text-slate-500">{t('logistics.reception')}:</span> {profile.hotelPhone}
          </p>
        )}
      </div>
      {transfers && transfers.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {transfers.map((tr) => (
            <li key={tr.id} className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-2 text-slate-200">
              <span className="font-medium">{tr.name}</span> · {new Date(tr.departureTime).toLocaleString()} ·{' '}
              {tr.meetingPoint}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function QuizzesSection({ liveQuizId, setLiveQuizId }: { liveQuizId: string | null; setLiveQuizId: (id: string | null) => void }) {
  const { t } = useTranslation()
  const { data: quizzes } = useMyQuizzes()
  const [take, setTake] = useState<QuizTakeDto | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [score, setScore] = useState<number | null>(null)

  async function open(quizId: string) {
    setScore(null)
    setAnswers({})
    setTake(await getQuizTake(quizId))
  }

  async function send() {
    if (!take) return
    const result = await submitQuiz(take.quizId, answers)
    setScore(result.score)
  }

  if (!quizzes || quizzes.length === 0) {
    return (
      <Card>
        <h2 className="mb-2 font-semibold text-white">{t('engagement.quizzes')}</h2>
        <p className="text-sm text-slate-500">{t('participant.quizzesEmpty')}</p>
      </Card>
    )
  }

  if (liveQuizId) {
    return <LiveQuizPlayerCard quizId={liveQuizId} onExit={() => setLiveQuizId(null)} />
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('engagement.quizzes')}</h2>
      {!take ? (
        <ul className="space-y-1 text-sm">
          {quizzes.map((q) => (
            <li key={q.id} className="flex items-center justify-between gap-2 text-slate-200">
              <span className="flex-1 truncate">{q.title}</span>
              <Button variant="ghost" onClick={() => setLiveQuizId(q.id)}>
                🔴 {t('engagement.liveTab')}
              </Button>
              <Button variant="ghost" onClick={() => open(q.id)}>
                {t('engagement.takeQuiz')}
              </Button>
            </li>
          ))}
        </ul>
      ) : score !== null ? (
        <div className="space-y-2">
          <p className="font-medium text-white">
            {t('engagement.yourScore')}: {score} / {take.questions.length}
          </p>
          <Button variant="ghost" onClick={() => setTake(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-semibold text-white">{take.title}</p>
          {take.questions.map((q) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-slate-200">{q.text}</p>
              {q.options.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ))}
          <Button onClick={send}>{t('engagement.submitQuiz')}</Button>
        </div>
      )}
    </Card>
  )
}

function NetworkingSection() {
  const { t } = useTranslation()
  const { data: contacts } = useMyContacts()
  const add = useAddContact()
  const [token, setToken] = useState('')

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    const match = token.trim().match(/[0-9a-f-]{36}/i)
    if (!match) return
    await add.mutateAsync(match[0])
    setToken('')
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('engagement.networking')}</h2>
      <form onSubmit={addContact} className="mb-3 flex gap-2">
        <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder={t('engagement.scanToken')} />
        <Button type="submit" disabled={add.isPending}>
          {t('engagement.addContact')}
        </Button>
      </form>
      {add.isError && <p className="mb-2 text-sm text-red-400">{t('engagement.contactError')}</p>}
      <ul className="space-y-1 text-sm">
        {(contacts ?? []).map((c, i) => (
          <li key={i} className="flex justify-between text-slate-200">
            <span>{c.name}</span>
            <span className="text-slate-500">{c.email}</span>
          </li>
        ))}
        {(contacts ?? []).length === 0 && <li className="text-slate-500">{t('engagement.noContacts')}</li>}
      </ul>
    </Card>
  )
}

function GallerySection() {
  const { t } = useTranslation()
  const { data: photos } = useMyGallery()
  const { data: ev } = useMyEvent()

  const customUrl = ev?.customPhotosUrl ?? null
  const customText = ev?.customPhotosText ?? null
  const hasPhotos = !!photos && photos.length > 0

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('gallery.title')}</h2>

      {/* Admin-provided external photos link / info, shown above the built-in gallery. */}
      {(customUrl || customText) && (
        <div className="mb-4 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-4">
          {customText && <p className="text-sm leading-relaxed text-slate-200">{customText}</p>}
          {customUrl && (
            <a
              href={customUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20"
            >
              📸 {t('gallery.openLink')}
            </a>
          )}
        </div>
      )}

      {hasPhotos ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos!.map((p) => (
            <Thumb key={p.id} path={`/api/me/gallery/${p.id}/file`} alt={p.fileName} />
          ))}
        </div>
      ) : (
        !customUrl &&
        !customText && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-xl ring-1 ring-inset ring-indigo-400/40">
              📸
            </div>
            <p className="mt-3 text-sm text-slate-400">{t('participant.galleryEmpty')}</p>
          </div>
        )
      )}
    </Card>
  )
}

function FeedbackSection() {
  const { t } = useTranslation()
  const submit = useSubmitFeedback()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) return
    await submit.mutateAsync({ rating, comment: comment || null })
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('feedback.title')}</h2>
      {submit.isSuccess ? (
        <p className="text-sm text-emerald-300">{t('feedback.thanks')}</p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-3xl ${n <= rating ? 'text-amber-400' : 'text-slate-600'}`}
                aria-label={`${n}`}
              >
                ★
              </button>
            ))}
          </div>
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('feedback.comment')} />
          <Button type="submit" disabled={rating < 1 || submit.isPending}>
            {t('feedback.send')}
          </Button>
        </form>
      )}
    </Card>
  )
}

function AgendaSection() {
  const { t, i18n } = useTranslation()
  const { data: items, isLoading } = useMyAgenda()
  const isEn = (i18n.resolvedLanguage ?? 'pl') === 'en'

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('agenda.title')}</h2>
      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (items ?? []).length === 0 ? (
        <p className="text-slate-500">{t('participant.agendaSoon')}</p>
      ) : (
        <ul className="space-y-2">
          {(items ?? []).map((item) => {
            const typeLabel = item.customTypeName
              ? (isEn && item.customTypeNameEn) || item.customTypeName
              : AgendaItemTypeName[item.type]
            return (
              <li key={item.id} className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-3">
                <div className="flex items-center gap-2">
                  {item.customTypeName && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: item.customTypeColor ?? '#a5b4fc',
                        backgroundColor: `${item.customTypeColor ?? '#6366f1'}1a`,
                      }}
                    >
                      {item.customTypeIcon || '🏷'} {typeLabel}
                    </span>
                  )}
                  <p className="font-medium text-white">{isEn ? item.titleEn : item.titlePl}</p>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  {new Date(item.startsAt).toLocaleString()}
                  {!item.customTypeName ? ` · ${typeLabel}` : ''}
                  {item.locationName ? ` · ${item.locationName}` : ''}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

// Listens on an event-wide channel so the participant is told when ANY quiz at
// their event goes live (the host's "start" broadcasts here). Returns the live
// quiz to surface in the join banner, or null.
function useLiveQuizAnnounce(eventId: string) {
  const [announced, setAnnounced] = useState<{ quizId: string; title: string } | null>(null)
  useEffect(() => {
    const conn = createQuizConnection()
    conn.on('liveQuizStarted', (p: { quizId: string; title: string }) => setAnnounced(p))
    conn.on('liveQuizEnded', (p: { quizId: string }) =>
      setAnnounced((cur) => (cur && cur.quizId === p.quizId ? null : cur)),
    )
    conn.start().then(() => conn.invoke('JoinEvent', eventId)).catch(() => {
      /* announcements are best-effort; the quiz list still works */
    })
    return () => { void conn.stop() }
  }, [eventId])
  return announced
}

// ============ Participant-side LIVE quiz player ============

interface LiveBoardEntry { name: string; score: number }
interface LiveQuestion { index: number; questionCount: number; text: string; options: string[] }

function LiveQuizPlayerCard({ quizId, onExit }: { quizId: string; onExit: () => void }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<'connecting' | 'lobby' | 'asking' | 'revealed' | 'finished'>('connecting')
  const [question, setQuestion] = useState<LiveQuestion | null>(null)
  const [correctIndex, setCorrectIndex] = useState<number | null>(null)
  const [pickedIndex, setPickedIndex] = useState<number | null>(null)
  const [board, setBoard] = useState<LiveBoardEntry[]>([])
  const connRef = useRef<ReturnType<typeof createQuizConnection> | null>(null)

  useEffect(() => {
    const conn = createQuizConnection()
    connRef.current = conn

    conn.on('state', (s: { phase: string; question: LiveQuestion | null }) => {
      if (s.phase === 'finished') setPhase('finished')
      else if (s.question) {
        setQuestion(s.question)
        setPhase(s.phase === 'revealed' ? 'revealed' : 'asking')
      } else {
        setPhase('lobby')
      }
    })
    conn.on('started', () => {
      setPhase('lobby')
      setQuestion(null)
      setBoard([])
    })
    conn.on('question', (q: LiveQuestion) => {
      setQuestion(q)
      setCorrectIndex(null)
      setPickedIndex(null)
      setPhase('asking')
    })
    conn.on('reveal', (p: { correctIndex: number; leaderboard: LiveBoardEntry[] }) => {
      setCorrectIndex(p.correctIndex)
      setBoard(p.leaderboard)
      setPhase('revealed')
    })
    conn.on('finished', (p: { leaderboard: LiveBoardEntry[] }) => {
      setBoard(p.leaderboard)
      setPhase('finished')
    })

    conn.start()
      .then(() => conn.invoke('JoinQuiz', quizId))
      .then(() => setPhase((p) => (p === 'connecting' ? 'lobby' : p)))
      .catch(() => setPhase('lobby'))

    return () => { void conn.stop() }
  }, [quizId])

  async function pick(i: number) {
    if (pickedIndex !== null || phase !== 'asking') return
    setPickedIndex(i)
    try { await connRef.current?.invoke('SubmitAnswer', quizId, i) } catch { /* host sees count anyway */ }
  }

  const colors = ['from-rose-500 to-red-500', 'from-sky-500 to-blue-500', 'from-amber-400 to-yellow-500', 'from-emerald-500 to-green-500']

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-inset ring-rose-400/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
          </span>
          LIVE
        </span>
        <button onClick={onExit} className="text-xs text-slate-400 hover:text-white">✕</button>
      </div>

      {phase === 'connecting' && <p className="mt-4 text-sm text-slate-400">…</p>}

      {phase === 'lobby' && (
        <p className="mt-4 text-sm text-slate-300">{t('engagement.liveWaitingHost')}</p>
      )}

      {(phase === 'asking' || phase === 'revealed') && question && (
        <>
          <p className="mt-3 text-[11px] uppercase tracking-wider text-slate-500">
            {question.index + 1} / {question.questionCount}
          </p>
          <p className="mt-1 text-xl font-bold text-white">{question.text}</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {question.options.map((opt, i) => {
              const reveal = phase === 'revealed'
              const isPicked = pickedIndex === i
              const isCorrect = correctIndex === i
              const bg = reveal
                ? isCorrect
                  ? 'from-emerald-500 to-green-500'
                  : isPicked
                    ? 'from-rose-600 to-red-700 opacity-80'
                    : 'from-slate-700 to-slate-800 opacity-60'
                : colors[i % colors.length]
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={phase !== 'asking' || pickedIndex !== null}
                  className={`bg-gradient-to-br ${bg} relative rounded-xl px-4 py-5 text-left text-white shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed`}
                >
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-base font-semibold">{opt}</span>
                  {isPicked && phase === 'asking' && (
                    <span className="absolute right-3 top-3 text-[10px] font-bold uppercase">✓ {t('engagement.liveAnsweredOk')}</span>
                  )}
                </button>
              )
            })}
          </div>
          {phase === 'revealed' && (
            <p className="mt-3 text-xs text-slate-400">{t('engagement.liveWaitingNext')}</p>
          )}
        </>
      )}

      {phase === 'finished' && (
        <>
          <h3 className="mt-3 text-sm font-semibold text-white">🏆 {t('engagement.liveFinished')}</h3>
          <ol className="mt-3 space-y-1.5">
            {board.map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  i < 3 ? 'bg-gradient-to-r from-amber-500/10 to-transparent' : 'bg-slate-800/30'
                }`}
              >
                <span className="w-7 text-center text-sm">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs font-bold text-slate-400">#{i + 1}</span>}
                </span>
                <span className="flex-1 truncate text-sm text-white">{r.name}</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-amber-300">{r.score}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  )
}
