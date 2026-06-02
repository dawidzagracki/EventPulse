import { useState } from 'react'
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

  return (
    <div className="relative grid min-h-screen grid-cols-1 overflow-hidden lg:grid-cols-2">
      {/* Animated background blobs (covers entire viewport) */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-10 h-[28rem] w-[28rem] rounded-full bg-indigo-600/30 blur-3xl animate-pulse-slow" />
        <div className="absolute right-[-10rem] top-1/3 h-[32rem] w-[32rem] rounded-full bg-violet-600/30 blur-3xl animate-pulse-slow [animation-delay:1.5s]" />
        <div className="absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-fuchsia-600/20 blur-3xl animate-pulse-slow [animation-delay:3s]" />
        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(rgb(148 163 184) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* LEFT — marketing hero */}
      <aside className="relative hidden flex-col justify-between p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <span className="bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-xl font-extrabold tracking-tight text-transparent">
            Event<span className="font-light italic">Pulse</span>
          </span>
        </div>

        <div className="max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
            </span>
            EventPulse · v1
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-white xl:text-5xl">
            {t('auth.heroTitle')}
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-300">{t('auth.heroLead')}</p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li
                key={f.label}
                className="group flex items-start gap-3 rounded-xl border border-slate-800/70 bg-slate-900/40 p-3 backdrop-blur transition hover:border-indigo-400/40 hover:bg-slate-900/70"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-indigo-200 ring-1 ring-inset ring-indigo-400/30">
                  <Icon name={f.icon} className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-slate-200">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
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

      {/* RIGHT — login card */}
      <main className="relative flex items-center justify-center p-6">
        {/* Mobile logo */}
        <div className="absolute left-6 top-6 flex items-center gap-2 lg:hidden">
          <Logo size={32} />
          <span className="bg-gradient-to-r from-indigo-200 via-violet-200 to-fuchsia-200 bg-clip-text text-base font-extrabold tracking-tight text-transparent">
            Event<span className="font-light italic">Pulse</span>
          </span>
        </div>
        <div className="absolute right-6 top-6">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-md">
          <div className="relative rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl">
            {/* corner glow */}
            <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/10 via-transparent to-violet-500/10" />

            <div className="relative">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-violet-500/30">
                  <Icon name="shield" className="h-5 w-5 text-white" />
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
                <Button type="submit" className="w-full justify-center" disabled={busy}>
                  {busy ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {t('common.loading')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      {t('auth.login')}
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                        <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-800" />
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{t('auth.needHelp')}</span>
                <span className="h-px flex-1 bg-slate-800" />
              </div>
              <p className="mt-3 text-center text-sm text-slate-400">{t('auth.contactSupport')}</p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} EventPulse · v1.0
          </p>
        </div>
      </main>
    </div>
  )
}
