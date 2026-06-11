import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useMyAgenda,
  useMyProfile,
  useMyTransfers,
  useRsvp,
  useSubmitFeedback,
  useUpdateConsents,
  useUpdatePreferences,
} from './api'
import { useAuthStore } from '../../stores/authStore'
import { Button, Card, Field, Input } from '../../components/ui'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Logo } from '../../components/Logo'
import { AgendaItemTypeName, type MyProfileDto, type QuizTakeDto } from '../../types/api'
import { getQuizTake, submitQuiz, useAddContact, useMyContacts, useMyQuizzes } from '../engagement/api'
import { recordStationScan } from './api'
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

  return <ParticipantApp profile={profile} onLogout={handleLogout} />
}

// ===================== Tabbed app shell =====================
function ParticipantApp({ profile, onLogout }: { profile: MyProfileDto; onLogout: () => void }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('agenda')

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: 'agenda', label: t('participant.tabAgenda'), emoji: '📅' },
    { id: 'activities', label: t('participant.tabActivities'), emoji: '🎯' },
    { id: 'qr', label: t('participant.tabQr'), emoji: '🎟' },
    { id: 'gallery', label: t('participant.tabGallery'), emoji: '📸' },
    { id: 'profile', label: t('participant.tabProfile'), emoji: '👤' },
  ]

  return (
    <div className="min-h-screen pb-24">
      {/* Slim header */}
      <header className="sticky top-0 z-10 border-b border-slate-800/70 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Logo size={26} />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={onLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">
        {tab === 'agenda' && (
          <div className="space-y-5">
            <GreetingHero profile={profile} />
            <AgendaSection />
          </div>
        )}
        {tab === 'activities' && (
          <div className="space-y-5">
            <StationScanSection />
            <QuizzesSection />
            <NetworkingSection />
            <AiAssistantSection />
            <FeedbackSection />
          </div>
        )}
        {tab === 'qr' && <MyQrScreen profile={profile} />}
        {tab === 'gallery' && <GallerySection />}
        {tab === 'profile' && (
          <div className="space-y-5">
            <PreferencesSection key={`prefs-${profile.id}`} profile={profile} />
            <LogisticsSection profile={profile} />
            <ConsentsSection key={`consents-${profile.id}`} profile={profile} />
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800/70 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-stretch">
          {tabs.map((tb) => {
            const active = tab === tb.id
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
                  >
                    {tb.emoji}
                  </span>
                ) : (
                  <span className={`text-lg transition ${active ? 'scale-110' : 'opacity-60'}`}>{tb.emoji}</span>
                )}
                <span className={`text-[10px] font-medium ${active ? 'text-indigo-300' : 'text-slate-500'}`}>
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
  const isEn = (i18n.resolvedLanguage ?? 'pl') === 'en'

  const now = nowMs()
  const next = (items ?? [])
    .filter((it) => new Date(it.startsAt).getTime() >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0]

  const seat = profile.tableName || profile.roomNumber

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-transparent p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-violet-300/80">{t('dashboard.live')}</p>
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
  const [result, setResult] = useState<{ name: string; dup: boolean } | null>(null)
  const [camOk, setCamOk] = useState<boolean | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    let stream: MediaStream | undefined
    let timer: number | undefined

    async function start() {
      const w = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }
      if (!w.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
        setCamOk(false)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop())
          return
        }
        const video = videoRef.current!
        video.srcObject = stream
        await video.play()
        setCamOk(true)
        const detector = new w.BarcodeDetector({ formats: ['qr_code'] })
        const tick = async () => {
          if (cancelled) return
          try {
            const codes = await detector.detect(video)
            if (codes[0]?.rawValue && !busyRef.current) {
              busyRef.current = true
              const code = parseStationCode(codes[0].rawValue)
              try {
                const r = await recordStationScan(code)
                setResult({ name: r.stationCode, dup: r.duplicate })
                setOpen(false)
              } finally {
                window.setTimeout(() => (busyRef.current = false), 1500)
              }
              return
            }
          } catch {
            /* transient */
          }
          timer = window.setTimeout(() => void tick(), 400)
        }
        void tick()
      } catch {
        setCamOk(false)
      }
    }
    void start()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [open])

  return (
    <Card>
      <h2 className="mb-1 font-semibold text-white">{t('participant.stationScan')}</h2>
      <p className="mb-3 text-sm text-slate-400">{t('participant.stationScanHint')}</p>

      {result && (
        <p
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            result.dup ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-300'
          }`}
        >
          {result.dup ? t('participant.stationScanDup') : t('participant.stationScanned', { name: result.name })}
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
function RodoGate({ profile, onLogout }: { profile: MyProfileDto; onLogout: () => void }) {
  const { t } = useTranslation()
  const update = useUpdateConsents()
  const [rodo, setRodo] = useState(profile.hasAcceptedRodo)
  const [photo, setPhoto] = useState(profile.photoConsent)
  const [networking, setNetworking] = useState(profile.networkingConsent)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!rodo) return
    await update.mutateAsync({ rodoAccepted: rodo, photoConsent: photo, networkingConsent: networking })
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl animate-pulse-slow" />
        <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-violet-600/25 blur-3xl animate-pulse-slow [animation-delay:1.5s]" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-5 flex items-center justify-between">
          <Logo size={32} />
          <Button variant="ghost" onClick={onLogout}>
            {t('common.logout')}
          </Button>
        </div>

        <Card glow>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-xl text-white shadow-lg shadow-violet-500/30">
              👋
            </span>
            <div>
              <h1 className="text-lg font-bold text-white">{t('participant.hello', { name: profile.firstName })}</h1>
              <p className="text-xs text-slate-400">{t('participant.rodoGateLead')}</p>
            </div>
          </div>

          <form onSubmit={save} className="space-y-2.5">
            <ConsentRow checked={rodo} onChange={setRodo} required label={t('participant.rodo')} />
            <ConsentRow checked={photo} onChange={setPhoto} label={t('participant.photo')} />
            <ConsentRow checked={networking} onChange={setNetworking} label={t('participant.networking')} />
            {!rodo && <p className="px-1 text-[11px] text-amber-300">{t('participant.rodoRequired')}</p>}
            <Button type="submit" className="mt-2 w-full justify-center" disabled={!rodo || update.isPending}>
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

// ===================== Existing sections (reused) =====================
function ConsentsSection({ profile }: { profile: MyProfileDto }) {
  const { t } = useTranslation()
  const update = useUpdateConsents()

  const [rodo, setRodo] = useState(profile.hasAcceptedRodo)
  const [photo, setPhoto] = useState(profile.photoConsent)
  const [networking, setNetworking] = useState(profile.networkingConsent)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await update.mutateAsync({ rodoAccepted: rodo, photoConsent: photo, networkingConsent: networking })
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('participant.consents')}</h2>
      <form onSubmit={save} className="space-y-2.5">
        <ConsentRow checked={rodo} onChange={setRodo} required label={t('participant.rodo')} />
        <ConsentRow checked={photo} onChange={setPhoto} label={t('participant.photo')} />
        <ConsentRow checked={networking} onChange={setNetworking} label={t('participant.networking')} />
        <Button type="submit" disabled={!rodo || update.isPending}>
          {t('common.save')}
        </Button>
      </form>
    </Card>
  )
}

function PreferencesSection({ profile }: { profile: MyProfileDto }) {
  const { t, i18n } = useTranslation()
  const update = useUpdatePreferences()

  const [language, setLanguage] = useState(profile.language)
  const [dietary, setDietary] = useState(profile.dietaryPreferences ?? '')
  const [shirt, setShirt] = useState(profile.shirtSize ?? '')
  const [wishes, setWishes] = useState(profile.wishes ?? '')
  const [transfer, setTransfer] = useState(profile.airportTransfer)
  const [arrival, setArrival] = useState(profile.arrivalTime ?? '')
  const [flight, setFlight] = useState(profile.flightNumber ?? '')

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

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('participant.preferences')}</h2>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label={t('participant.language')}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          >
            <option value="pl">PL</option>
            <option value="en">EN</option>
          </select>
        </Field>
        <Field label={t('participant.dietary')}>
          <Input value={dietary} onChange={(e) => setDietary(e.target.value)} />
        </Field>
        <Field label={t('participant.shirt')}>
          <Input value={shirt} onChange={(e) => setShirt(e.target.value)} />
        </Field>
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

function QuizzesSection() {
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

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('engagement.quizzes')}</h2>
      {!take ? (
        <ul className="space-y-1 text-sm">
          {quizzes.map((q) => (
            <li key={q.id} className="flex items-center justify-between text-slate-200">
              <span>{q.title}</span>
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

  return (
    <Card>
      <h2 className="mb-3 font-semibold text-white">{t('gallery.title')}</h2>
      {!photos || photos.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-xl ring-1 ring-inset ring-indigo-400/40">
            📸
          </div>
          <p className="mt-3 text-sm text-slate-400">{t('participant.galleryEmpty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <Thumb key={p.id} path={`/api/me/gallery/${p.id}/file`} alt={p.fileName} />
          ))}
        </div>
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
          {(items ?? []).map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-3">
              <p className="font-medium text-white">{isEn ? item.titleEn : item.titlePl}</p>
              <p className="text-sm text-slate-400">
                {new Date(item.startsAt).toLocaleString()} · {AgendaItemTypeName[item.type]}
                {item.locationName ? ` · ${item.locationName}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
