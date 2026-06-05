import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from './api'
import { useAuthStore } from '../../stores/authStore'
import { Button, Field, Input } from '../../components/ui'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { Logo } from '../../components/Logo'
import { Icon } from '../../components/Icon'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Mouse-tracking spotlight + login-card 3D tilt.
  const surfaceRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface) return
    function onMove(e: MouseEvent) {
      const rect = surface!.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      surface!.style.setProperty('--mx', `${x}%`)
      surface!.style.setProperty('--my', `${y}%`)
      // Card tilt — calculate from card center, max ±5deg.
      const card = cardRef.current
      if (card) {
        const cr = card.getBoundingClientRect()
        const cx = cr.left + cr.width / 2
        const cy = cr.top + cr.height / 2
        const dx = (e.clientX - cx) / cr.width
        const dy = (e.clientY - cy) / cr.height
        const max = 5
        const rotY = Math.max(-max, Math.min(max, dx * max * 2))
        const rotX = Math.max(-max, Math.min(max, -dy * max * 2))
        card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg)`
      }
    }
    function onLeave() {
      const card = cardRef.current
      if (card) card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)'
    }
    surface.addEventListener('mousemove', onMove)
    surface.addEventListener('mouseleave', onLeave)
    return () => {
      surface.removeEventListener('mousemove', onMove)
      surface.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const auth = await login(email, password)
      setAuth(auth)
      navigate('/events', { replace: true })
    } catch {
      setError(t('auth.invalid'))
    } finally {
      setBusy(false)
    }
  }

  const features = [
    { icon: 'sparkles' as const, label: t('auth.feature1') },
    { icon: 'document' as const, label: t('auth.feature2') },
    { icon: 'qr' as const, label: t('auth.feature3') },
    { icon: 'image' as const, label: t('auth.feature4') },
  ]

  // Rotating word list to drop after "Zaplanuj swoją". 5 entries match the CSS
  // keyframes that fade each in/out in sequence over 12 s.
  const rotatingWords = ['Konferencję', 'Galę', 'Premierę', 'Festiwal', 'Integrację']

  return (
    <div
      ref={surfaceRef}
      className="relative grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-2"
      style={{ ['--mx' as string]: '50%', ['--my' as string]: '50%' }}
    >
      {/* ───────────── Layered backdrop ───────────── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {/* Aurora layer A */}
        <div
          className="absolute -left-1/4 -top-1/4 h-[140%] w-[80%] rounded-full blur-3xl opacity-60 animate-aurora-a"
          style={{
            background:
              'radial-gradient(closest-side, rgba(99,102,241,0.45), transparent 70%)',
          }}
        />
        {/* Aurora layer B */}
        <div
          className="absolute right-[-20%] top-[-10%] h-[120%] w-[70%] rounded-full blur-3xl opacity-55 animate-aurora-b"
          style={{
            background:
              'radial-gradient(closest-side, rgba(217,70,239,0.4), transparent 70%)',
          }}
        />
        {/* Accent blob bottom-left */}
        <div className="absolute -bottom-32 left-1/4 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/20 blur-3xl animate-pulse-slow [animation-delay:3s]" />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'radial-gradient(rgb(148 163 184) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Mouse-tracking spotlight on top of everything */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(420px circle at var(--mx) var(--my), rgba(165,180,252,0.18), transparent 60%)',
          }}
          aria-hidden
        />
        {/* Subtle vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(closest-side at 50% 50%, transparent 50%, rgba(2,6,23,0.4) 100%)',
          }}
          aria-hidden
        />
      </div>

      {/* ───────────── LEFT — marketing hero ───────────── */}
      <aside className="relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3 fade-up">
          <Logo size={40} />
          <span className="bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            Event<span className="font-light italic">Pulse</span>
          </span>
        </div>

        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200 backdrop-blur fade-up">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
            </span>
            EventPulse · v1
          </span>

          {/* Headline with rotating event-type word */}
          <h1 className="mt-5 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-white xl:text-6xl fade-up-delay-1">
            Zaplanuj swoją
            <br />
            <span className="relative inline-block h-[1.1em] overflow-hidden align-bottom">
              <span className="invisible whitespace-nowrap">{rotatingWords[0]}</span>
              <span
                className="word-cycle absolute inset-0 bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent"
                aria-hidden
              >
                {rotatingWords.map((w) => (
                  <span key={w} className="absolute inset-0 whitespace-nowrap">
                    {w}
                  </span>
                ))}
              </span>
            </span>
          </h1>
          <p className="mt-5 max-w-md text-base text-slate-300/95 fade-up-delay-2">{t('auth.heroLead')}</p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2 fade-up-delay-3">
            {features.map((f) => (
              <li
                key={f.label}
                className="group relative flex items-start gap-3 overflow-hidden rounded-xl border border-slate-800/70 bg-slate-900/40 p-3 backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-400/40 hover:bg-slate-900/70"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-12 -top-12 h-24 w-24 rounded-full bg-indigo-500/0 blur-2xl transition group-hover:bg-indigo-500/20"
                />
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
                  <Icon name={f.icon} className="h-4 w-4" />
                </span>
                <span className="relative text-sm font-medium text-slate-200">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 fade-up-delay-4">
          <div className="flex -space-x-2">
            {['#6366f1', '#8b5cf6', '#d946ef'].map((c, i) => (
              <span
                key={i}
                className="h-7 w-7 rounded-full ring-2 ring-slate-950"
                style={{ background: `linear-gradient(135deg, ${c}, #0f172a)` }}
              />
            ))}
          </div>
          <span>{t('auth.trustedBy')}</span>
        </div>
      </aside>

      {/* ───────────── RIGHT — login card + floating mockups ───────────── */}
      <main className="relative flex items-center justify-center p-6">
        {/* Floating glass mockups behind the form (decorative) */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
          <FloatingPreviewA />
          <FloatingPreviewB />
          <FloatingPreviewC />
        </div>

        {/* Mobile logo */}
        <div className="absolute left-6 top-6 flex items-center gap-2 lg:hidden">
          <Logo size={32} />
          <span className="bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-base font-extrabold tracking-tight text-transparent">
            Event<span className="font-light italic">Pulse</span>
          </span>
        </div>
        <div className="absolute right-6 top-6 z-10">
          <LanguageSwitcher />
        </div>

        <div className="relative z-10 w-full max-w-md fade-up-delay-2">
          {/* Card with 3D tilt */}
          <div
            ref={cardRef}
            className="relative rounded-2xl border border-slate-800/80 bg-slate-900/70 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl transition-transform duration-200 ease-out will-change-transform"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Corner glow */}
            <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10" />
            {/* Subtle top edge highlight */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
            />

            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-violet-500/30">
                  <Icon name="shield" className="h-5 w-5 text-white" />
                  <span
                    className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-br from-indigo-400/40 to-violet-400/40 blur-md"
                    aria-hidden
                  />
                </span>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white">{t('auth.loginTitle')}</h2>
                  <p className="text-sm text-slate-400">{t('auth.subtitle')}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label={t('auth.email')}>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder="you@agency.com"
                  />
                </Field>
                <Field label={t('auth.password')}>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </Field>
                {error && (
                  <p className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                    <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-400" />
                    {error}
                  </p>
                )}

                {/* CTA with revolving conic glow ring */}
                <div className="relative">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-0.5 rounded-lg opacity-70"
                    style={{
                      background:
                        'conic-gradient(from 0deg, #6366f1, #8b5cf6, #d946ef, #6366f1)',
                      filter: 'blur(8px)',
                    }}
                  >
                    <span className="block h-full w-full animate-spin-slow rounded-lg" />
                  </span>
                  <Button type="submit" className="relative w-full justify-center" disabled={busy}>
                    {busy ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        {t('common.loading')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        {t('auth.login')}
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                          <path
                            d="M5 12h13M13 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    )}
                  </Button>
                </div>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-800" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t('auth.needHelp')}</span>
                <span className="h-px flex-1 bg-slate-800" />
              </div>
              <p className="mt-3 text-center text-sm text-slate-400">{t('auth.contactSupport')}</p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500 fade-up-delay-4">
            © {new Date().getFullYear()} EventPulse · v1.0
          </p>
        </div>
      </main>
    </div>
  )
}

// ───────────── Floating glassy preview cards behind the form ─────────────

function FloatingPreviewA() {
  return (
    <div className="animate-card-a absolute -left-12 top-16 hidden w-56 rotate-[-6deg] rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md shadow-2xl shadow-indigo-950/40 xl:block">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Live</span>
        <span className="ml-auto text-[10px] text-slate-400">14:32</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-white">Konferencja IT 2026</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/60">
        <div className="h-full w-3/4 bg-gradient-to-r from-emerald-400 to-teal-400" />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="text-slate-400">Obecność</span>
        <span className="font-mono font-bold text-emerald-300">73%</span>
      </div>
    </div>
  )
}

function FloatingPreviewB() {
  return (
    <div className="animate-card-b absolute right-0 top-8 hidden w-48 rotate-[5deg] rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md shadow-2xl shadow-violet-950/40 xl:block">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 flex-col items-center justify-center rounded-md border border-white/10 bg-slate-950/70">
          <span className="text-[8px] font-bold text-violet-300">CZE</span>
          <span className="text-xs font-bold text-white">27</span>
        </div>
        <p className="text-xs font-semibold text-white">Gala Firmowa</p>
      </div>
      <div className="mt-2 flex -space-x-1.5">
        {['#a78bfa', '#f472b6', '#34d399', '#fbbf24'].map((c, i) => (
          <span key={i} className="h-5 w-5 rounded-full ring-2 ring-slate-900" style={{ background: c }} />
        ))}
        <span className="ml-2 text-[10px] text-slate-400">+128</span>
      </div>
    </div>
  )
}

function FloatingPreviewC() {
  return (
    <div className="animate-card-c absolute -left-4 bottom-20 hidden w-44 rotate-[-2deg] rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md shadow-2xl shadow-fuchsia-950/40 xl:block">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-[10px] text-white">
          QR
        </span>
        <p className="text-xs font-semibold text-white">Skaner check-in</p>
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-slate-400">+12 ostatnich 60s</p>
      <div className="mt-1.5 flex items-end gap-0.5">
        {[35, 60, 45, 80, 55, 90, 70, 100, 65, 85, 50, 75].map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-sm bg-gradient-to-t from-indigo-500 to-fuchsia-400"
            style={{ height: `${h * 0.16}rem` }}
          />
        ))}
      </div>
    </div>
  )
}
