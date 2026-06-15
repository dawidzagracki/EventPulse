import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { extractToken, flushQueue } from './api'
import { feedback } from './feedback'
import { enqueueScan, queueCount } from '../../lib/scanQueue'
import { Button, Card, Input } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { ScanKind, type ScanResultItem } from '../../types/api'
import { useAuthStore } from '../../stores/authStore'

type Feedback =
  | { kind: 'ok'; item: ScanResultItem; mode: number }
  | { kind: 'warn'; item: ScanResultItem; mode: number }
  | { kind: 'error'; reason: 'notfound' | 'badcode' }
  | { kind: 'queued' }

const stationKey = (eventId: string) => `ep.scanner.station.${eventId}`
const tutorialKey = 'ep.scanner.tutorialSeen'

// Module-scope clock read so the component body stays "pure" for the linter
// (these are only ever called from event handlers / async callbacks).
const nowMs = () => Date.now()

const PRESET_STATIONS = [
  { id: 'entry', i18n: 'scanner.stationEntry', emoji: '🚪' },
  { id: 'bar', i18n: 'scanner.stationBar', emoji: '🍸' },
  { id: 'hall', i18n: 'scanner.stationHall', emoji: '🏛' },
  { id: 'contest', i18n: 'scanner.stationContest', emoji: '🎯' },
] as const

export function ScannerPage() {
  const { eventId = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const principalType = useAuthStore((s) => s.principalType)
  const logout = useAuthStore((s) => s.logout)
  const isOperator = principalType === 'Operator'

  function exitScanner() {
    if (!confirm(t('scanner.logoutConfirm'))) return
    logout()
    navigate('/login', { replace: true })
  }

  const [station, setStation] = useState<string | null>(() => localStorage.getItem(stationKey(eventId)))
  const [showTutorial, setShowTutorial] = useState<boolean>(() => !localStorage.getItem(tutorialKey))
  const [kind, setKind] = useState<number>(ScanKind.CheckIn)
  const [modeLocked, setModeLocked] = useState(false)
  const [pending, setPending] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [camera, setCamera] = useState<'idle' | 'on' | 'unsupported' | 'denied'>('idle')
  const [manual, setManual] = useState('')
  const [fb, setFb] = useState<Feedback | null>(null)
  const [scanCount, setScanCount] = useState(0)

  const videoRef = useRef<HTMLVideoElement>(null)
  const kindRef = useRef(kind)
  const stationRef = useRef(station)
  const lastScan = useRef<{ token: string; at: number }>({ token: '', at: 0 })

  const updatePending = () => queueCount().then(setPending)

  async function backgroundSync() {
    if (!navigator.onLine) return
    try {
      await flushQueue(eventId)
      await updatePending()
    } catch {
      // Stay queued until connectivity returns.
    }
  }
  const backgroundSyncRef = useRef(backgroundSync)

  async function handleScan(raw: string) {
    const token = extractToken(raw)
    if (!token) {
      showFeedback({ kind: 'error', reason: 'badcode' })
      return
    }
    // Debounce repeated reads of the same code.
    if (token === lastScan.current.token && nowMs() - lastScan.current.at < 2500) return
    lastScan.current = { token, at: nowMs() }

    const clientId = crypto.randomUUID()
    const mode = kindRef.current
    await enqueueScan({
      clientId,
      eventId,
      participantToken: token,
      kind: mode,
      occurredAt: new Date().toISOString(),
      online: navigator.onLine,
      stationCode: stationRef.current,
    })
    await updatePending()

    if (!navigator.onLine) {
      showFeedback({ kind: 'queued' })
      return
    }

    // Online: flush immediately and report on our own item.
    try {
      const result = await flushQueue(eventId)
      await updatePending()
      const mine = result?.items.find((i) => i.clientId === clientId)
      if (!mine) {
        // A background flush already sent it — we lost the detail.
        showFeedback({ kind: 'queued' })
        return
      }
      if (mine.status === 'notfound') {
        showFeedback({ kind: 'error', reason: 'notfound' })
      } else if (mine.alreadyCheckedIn) {
        showFeedback({ kind: 'warn', item: mine, mode })
      } else {
        showFeedback({ kind: 'ok', item: mine, mode })
      }
    } catch {
      showFeedback({ kind: 'queued' })
    }
  }
  const handleScanRef = useRef(handleScan)

  function showFeedback(next: Feedback) {
    setFb(next)
    if (next.kind === 'ok') {
      setScanCount((c) => c + 1)
      feedback('ok')
    } else if (next.kind === 'warn') {
      feedback('warn')
    } else if (next.kind === 'error') {
      feedback('error')
    }
    // Auto-dismiss after a short window so the operator is ready for the next scan.
    if (next.kind !== 'queued') {
      window.setTimeout(() => {
        setFb((cur) => (cur === next ? null : cur))
      }, next.kind === 'ok' ? 2200 : 3200)
    } else {
      window.setTimeout(() => setFb((cur) => (cur === next ? null : cur)), 1200)
    }
  }

  // Keep refs pointing at the latest closures.
  useEffect(() => {
    kindRef.current = kind
    stationRef.current = station
    backgroundSyncRef.current = backgroundSync
    handleScanRef.current = handleScan
  })

  // Connectivity + periodic background sync.
  useEffect(() => {
    void updatePending()
    void backgroundSyncRef.current()
    const onOnline = () => {
      setOnline(true)
      void backgroundSyncRef.current()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const id = window.setInterval(() => void backgroundSyncRef.current(), 5000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.clearInterval(id)
    }
  }, [])

  // Camera scanning (best-effort; manual entry always works). Only starts once a station is chosen.
  useEffect(() => {
    if (!station) return
    let cancelled = false
    let stream: MediaStream | undefined
    let timer: number | undefined

    async function start() {
      if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
        setCamera('unsupported')
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
        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        setCamera('on')
        const tick = async () => {
          if (cancelled) return
          try {
            const codes = await detector.detect(video)
            if (codes[0]?.rawValue) await handleScanRef.current(codes[0].rawValue)
          } catch {
            // transient detect error; keep going
          }
          timer = window.setTimeout(() => void tick(), 400)
        }
        void tick()
      } catch {
        setCamera('denied')
      }
    }

    void start()
    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      stream?.getTracks().forEach((tr) => tr.stop())
    }
  }, [station])

  function chooseStation(code: string) {
    localStorage.setItem(stationKey(eventId), code)
    setStation(code)
  }

  // ─────────── Station picker (onboarding) ───────────
  if (!station) {
    return <StationPicker onPick={chooseStation} />
  }

  const modeLabel = kind === ScanKind.CheckIn ? t('scanner.checkIn') : t('scanner.checkOut')

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* First-run tutorial */}
      {showTutorial && (
        <ScannerTutorial
          onDone={() => {
            localStorage.setItem(tutorialKey, '1')
            setShowTutorial(false)
          }}
        />
      )}

      {/* Feedback overlay */}
      {fb && <FeedbackOverlay fb={fb} onDismiss={() => setFb(null)} />}

      <div className="mx-auto max-w-md space-y-4 p-4">
        {/* Top status bar */}
        <div className="flex items-center justify-between gap-2">
          {isOperator ? (
            <button
              onClick={exitScanner}
              className="inline-flex items-center gap-1 text-sm text-rose-300 hover:text-rose-200"
            >
              <Icon name="chevronLeft" className="h-4 w-4" />
              {t('scanner.logout')}
            </button>
          ) : (
            <Link to={`/events/${eventId}`} className="inline-flex items-center gap-1 text-sm text-indigo-300 hover:text-indigo-200">
              <Icon name="chevronLeft" className="h-4 w-4" />
              {t('eventDetail.overview')}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                online
                  ? 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30'
                  : 'bg-amber-400/15 text-amber-300 ring-amber-400/30'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {online ? t('scanner.online') : t('scanner.offline')}
            </span>
            {pending > 0 && (
              <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300">
                {t('scanner.pending')}: {pending}
              </span>
            )}
          </div>
        </div>

        {/* Station + total scans chips */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              localStorage.removeItem(stationKey(eventId))
              setStation(null)
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-200 hover:border-indigo-400/40"
            title={t('scanner.stationChange')}
          >
            <Icon name="mapPin" className="h-3 w-3 text-indigo-300" />
            {station}
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 px-3 py-1 text-xs text-slate-400">
            <Icon name="check" className="h-3 w-3 text-emerald-400" />
            {t('scanner.totalScans')}: <span className="font-bold tabular-nums text-white">{scanCount}</span>
          </span>
        </div>

        {/* Mode toggle with lock */}
        <div className="flex items-center gap-2">
          <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-1">
            {([ScanKind.CheckIn, ScanKind.CheckOut] as const).map((k) => (
              <button
                key={k}
                onClick={() => !modeLocked && setKind(k)}
                disabled={modeLocked && kind !== k}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  kind === k
                    ? k === ScanKind.CheckIn
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                } ${modeLocked && kind !== k ? 'cursor-not-allowed opacity-40' : ''}`}
              >
                {k === ScanKind.CheckIn ? t('scanner.checkIn') : t('scanner.checkOut')}
              </button>
            ))}
          </div>
          <button
            onClick={() => setModeLocked((v) => !v)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
              modeLocked
                ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                : 'border-slate-700/60 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
            title={modeLocked ? t('scanner.modeUnlock') : t('scanner.modeLocked')}
            aria-label={modeLocked ? t('scanner.modeUnlock') : t('scanner.modeLocked')}
          >
            {modeLocked ? '🔒' : '🔓'}
          </button>
        </div>

        {/* Camera */}
        <Card className="!p-2">
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
            {camera === 'on' && (
              <>
                {/* Scan reticle */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-2xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
                <p className="absolute inset-x-0 bottom-2 text-center text-xs text-white/80">{t('scanner.tapToScan')}</p>
              </>
            )}
            {camera !== 'on' && (
              <div className="flex aspect-square w-full items-center justify-center p-6 text-center text-sm text-slate-400">
                {camera === 'unsupported'
                  ? t('scanner.cameraUnsupported')
                  : camera === 'denied'
                    ? t('scanner.cameraDenied')
                    : t('common.loading')}
              </div>
            )}
          </div>
        </Card>

        {/* Manual entry */}
        <Card>
          <p className="mb-2 text-sm font-medium text-slate-200">{t('scanner.manual')}</p>
          <div className="flex gap-2">
            <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="token / link" />
            <Button
              onClick={async () => {
                await handleScan(manual)
                setManual('')
              }}
            >
              {t('scanner.scan')}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {t('scanner.station')}: <span className="text-slate-300">{station}</span> · {modeLabel}
          </p>
        </Card>
      </div>
    </div>
  )
}

// ─────────── Station picker ───────────
function StationPicker({ onPick }: { onPick: (code: string) => void }) {
  const { t } = useTranslation()
  const [custom, setCustom] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
            <Icon name="qr" className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">{t('scanner.stationPick')}</h1>
          <p className="mt-1 text-sm text-slate-400">{t('scanner.stationPickHint')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {PRESET_STATIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => onPick(t(s.i18n))}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-slate-900"
            >
              <span className="text-3xl">{s.emoji}</span>
              <span className="text-sm font-semibold text-white">{t(s.i18n)}</span>
            </button>
          ))}
        </div>

        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="mt-3 w-full rounded-2xl border border-dashed border-slate-700 px-4 py-3 text-sm text-slate-400 transition hover:border-indigo-400/60 hover:bg-indigo-500/5 hover:text-white"
          >
            + {t('scanner.stationCustom')}
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (custom.trim()) onPick(custom.trim())
            }}
            className="mt-3 flex gap-2"
          >
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              autoFocus
              placeholder={t('scanner.stationCustomPlaceholder')}
            />
            <Button type="submit" disabled={!custom.trim()}>
              {t('scanner.stationStart')}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─────────── Feedback overlay ───────────
const STATUS_LABEL: Record<number, string> = {
  0: 'Invited',
  1: 'Activated',
  2: 'Confirmed',
  3: 'Declined',
  4: 'Checked-in',
  5: 'Checked-out',
  6: 'No-show',
}

function FeedbackOverlay({ fb, onDismiss }: { fb: Feedback; onDismiss: () => void }) {
  const { t, i18n } = useTranslation()

  if (fb.kind === 'queued') {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
        <div className="rounded-full bg-slate-800/90 px-4 py-2 text-sm text-slate-200 shadow-lg backdrop-blur">
          ⏳ {t('scanner.queued')}
        </div>
      </div>
    )
  }

  const tone =
    fb.kind === 'ok'
      ? { bg: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-300', icon: '✓' }
      : fb.kind === 'warn'
        ? { bg: 'from-amber-500 to-orange-600', ring: 'ring-amber-300', icon: '!' }
        : { bg: 'from-rose-500 to-red-600', ring: 'ring-rose-300', icon: '✕' }

  let headline: string
  let sub: string | null = null
  let name: string | null = null
  let item: ScanResultItem | null = null

  if (fb.kind === 'error') {
    headline = t('scanner.notFoundBig')
    sub = t('scanner.notFoundHint')
  } else {
    item = fb.item
    name = item.name ?? '—'
    if (fb.kind === 'warn') {
      headline = fb.mode === ScanKind.CheckIn ? t('scanner.alreadyIn') : t('scanner.alreadyOut')
      if (item.previousAt) {
        sub = t('scanner.lastScanAt', {
          time: new Date(item.previousAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
        })
      }
    } else {
      headline = fb.mode === ScanKind.CheckIn ? t('scanner.checkedInOk') : t('scanner.checkedOutOk')
    }
  }

  return (
    <button
      onClick={onDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br ${tone.bg} p-6 text-center text-white animate-fade-overlay`}
    >
      <div className={`flex h-24 w-24 items-center justify-center rounded-full bg-white/20 text-5xl font-black ring-4 ${tone.ring}`}>
        {tone.icon}
      </div>
      <p className="mt-6 text-4xl font-black uppercase tracking-tight drop-shadow">{headline}</p>

      {name && <p className="mt-4 text-2xl font-bold drop-shadow">{name}</p>}

      {item && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {typeof item.participantStatus === 'number' && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
              {STATUS_LABEL[item.participantStatus] ?? item.participantStatus}
            </span>
          )}
          {item.tableName && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
              {t('scanner.table')}: {item.tableName}
            </span>
          )}
          {item.roomNumber && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
              {t('scanner.room')}: {item.roomNumber}
            </span>
          )}
          {item.dietary && (
            <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">🍽 {item.dietary}</span>
          )}
        </div>
      )}

      {sub && <p className="mt-4 text-lg text-white/90 drop-shadow">{sub}</p>}

      <p className="mt-8 text-sm uppercase tracking-[0.2em] text-white/70">{t('scanner.scanNext')} →</p>
    </button>
  )
}

// ============ First-run tutorial (3 slides) ============

function ScannerTutorial({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const slides = [
    {
      emoji: '📱',
      title: t('scanner.tutTitle1'),
      body: t('scanner.tutBody1'),
    },
    {
      emoji: '⚡',
      title: t('scanner.tutTitle2'),
      body: t('scanner.tutBody2'),
    },
    {
      emoji: '🎨',
      title: t('scanner.tutTitle3'),
      body: t('scanner.tutBody3'),
    },
  ]
  const last = step === slides.length - 1
  const s = slides[step]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl shadow-indigo-500/10">
        <button
          onClick={onDone}
          className="absolute right-4 top-4 text-xs text-slate-500 hover:text-slate-300"
        >
          {t('scanner.tutSkip')}
        </button>

        <div className="mb-4 text-center text-6xl">{s.emoji}</div>
        <h2 className="text-center text-xl font-bold text-white">{s.title}</h2>
        <p className="mt-3 text-center text-sm text-slate-300">{s.body}</p>

        <div className="mt-6 flex items-center justify-center gap-1.5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-indigo-400' : 'w-1.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="flex-1">
              {t('scanner.tutBack')}
            </Button>
          )}
          <Button
            onClick={() => (last ? onDone() : setStep((s) => s + 1))}
            className="flex-1"
          >
            {last ? t('scanner.tutDone') : t('scanner.tutNext')}
          </Button>
        </div>
      </div>
    </div>
  )
}
