import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'subtle' }) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60'
  const styles =
    variant === 'primary'
      ? 'text-white shadow-lg shadow-indigo-500/20 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400'
      : variant === 'subtle'
        ? 'bg-slate-800/60 text-slate-200 hover:bg-slate-800 border border-slate-700/60'
        : 'bg-transparent text-slate-300 hover:bg-slate-800/60'
  return <button className={`${base} ${styles} ${className}`} {...props} />
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20 ${className}`}
      {...props}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  )
}

/** Accessible on/off switch with an optional label + description, used across settings screens. */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
}) {
  const knob = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 disabled:opacity-40 ${
        checked ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )

  if (!label && !description) return knob

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        {label && <p className="text-sm font-medium text-slate-200">{label}</p>}
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      {knob}
    </div>
  )
}

export function Card({
  children,
  className = '',
  glow = false,
}: {
  children: ReactNode
  className?: string
  glow?: boolean
}) {
  return (
    <div
      className={`relative rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 backdrop-blur-sm ${
        glow ? 'shadow-2xl shadow-indigo-500/10' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'
}) {
  const styles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    accent: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  }[tone]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  )
}

interface StatProps {
  label: string
  value: string | number
  hint?: string
  badge?: { text: string; tone?: 'success' | 'warning' | 'danger' | 'info' | 'accent' }
  icon?: ReactNode
  accent?: 'indigo' | 'violet' | 'sky' | 'amber' | 'emerald'
}

export function Stat({ label, value, hint, badge, icon, accent = 'indigo' }: StatProps) {
  const accentRing = {
    indigo: 'from-indigo-500/40 to-transparent',
    violet: 'from-violet-500/40 to-transparent',
    sky: 'from-sky-500/40 to-transparent',
    amber: 'from-amber-500/40 to-transparent',
    emerald: 'from-emerald-500/40 to-transparent',
  }[accent]

  return (
    <Card className="relative overflow-hidden">
      <div className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${accentRing} blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800/80 text-slate-300">{icon}</div>
        {badge && <Badge tone={badge.tone ?? 'success'}>{badge.text}</Badge>}
      </div>
      <p className="relative mt-4 text-4xl font-bold tracking-tight text-white">{value}</p>
      <p className="relative mt-1 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">{label}</p>
      {hint && <p className="relative mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  )
}

export function ProgressBar({
  value,
  max,
  gradient = 'from-indigo-500 to-violet-500',
}: {
  value: number
  max: number
  gradient?: string
}) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full bg-gradient-to-r ${gradient}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
