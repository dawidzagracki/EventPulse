import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { extractToken, flushQueue } from './api'
import { enqueueScan, queueCount } from '../../lib/scanQueue'
import { Button, Card, Input } from '../../components/ui'
import { ScanKind } from '../../types/api'

export function ScannerPage() {
  const { eventId = '' } = useParams()
  const { t } = useTranslation()

  const [kind, setKind] = useState<number>(ScanKind.CheckIn)
  const [pending, setPending] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [message, setMessage] = useState<string | null>(null)
  const [camera, setCamera] = useState<'idle' | 'on' | 'unsupported' | 'denied'>('idle')
  const [manual, setManual] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const kindRef = useRef(kind)
  const lastScan = useRef<{ token: string; at: number }>({ token: '', at: 0 })

  const updatePending = () => queueCount().then(setPending)

  async function trySync() {
    if (!navigator.onLine) return
    try {
      const result = await flushQueue(eventId)
      await updatePending()
      if (result) {
        setMessage(`✓ ${result.accepted} · dup ${result.duplicates} · ? ${result.notFound}`)
      }
    } catch {
      // Stay queued until connectivity returns.
    }
  }
  const trySyncRef = useRef(trySync)

  async function handleScan(raw: string) {
    const token = extractToken(raw)
    if (!token) {
      setMessage(t('scanner.badCode'))
      return
    }
    // Debounce repeated reads of the same code.
    if (token === lastScan.current.token && Date.now() - lastScan.current.at < 3000) return
    lastScan.current = { token, at: Date.now() }

    await enqueueScan({
      clientId: crypto.randomUUID(),
      eventId,
      participantToken: token,
      kind: kindRef.current,
      occurredAt: new Date().toISOString(),
      online: navigator.onLine,
    })
    await updatePending()
    setMessage(t('scanner.queued'))
    void trySync()
  }
  const handleScanRef = useRef(handleScan)

  // Keep refs pointing at the latest closures (avoids stale state in timers/camera loop).
  useEffect(() => {
    kindRef.current = kind
    trySyncRef.current = trySync
    handleScanRef.current = handleScan
  })

  // Connectivity + periodic background sync.
  useEffect(() => {
    void updatePending()
    void trySyncRef.current()
    const onOnline = () => {
      setOnline(true)
      void trySyncRef.current()
    }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const id = window.setInterval(() => void trySyncRef.current(), 5000)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.clearInterval(id)
    }
  }, [])

  // Camera scanning (best-effort; manual entry always works).
  useEffect(() => {
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
          timer = window.setTimeout(() => void tick(), 500)
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
  }, [])

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Link to={`/events/${eventId}`} className="text-sm text-indigo-600 hover:underline">
          ← {t('eventDetail.overview')}
        </Link>
        <span className={`text-xs ${online ? 'text-emerald-600' : 'text-amber-600'}`}>
          {online ? t('scanner.online') : t('scanner.offline')} · {t('scanner.pending')}: {pending}
        </span>
      </div>

      <div className="flex overflow-hidden rounded-lg border border-slate-300">
        {([ScanKind.CheckIn, ScanKind.CheckOut] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`flex-1 py-2 text-sm font-medium ${kind === k ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
          >
            {k === ScanKind.CheckIn ? t('scanner.checkIn') : t('scanner.checkOut')}
          </button>
        ))}
      </div>

      <Card className="p-2">
        <video ref={videoRef} className="w-full rounded-lg bg-black" muted playsInline />
        {camera !== 'on' && (
          <p className="p-2 text-center text-sm text-slate-500">
            {camera === 'unsupported'
              ? t('scanner.cameraUnsupported')
              : camera === 'denied'
                ? t('scanner.cameraDenied')
                : t('common.loading')}
          </p>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium">{t('scanner.manual')}</p>
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
      </Card>

      {message && <p className="text-center text-sm text-slate-700">{message}</p>}
    </div>
  )
}
