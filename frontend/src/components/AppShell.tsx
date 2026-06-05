import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { Icon, type IconName } from './Icon'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'

export interface NavItem {
  id: string
  label: string
  icon: IconName
  onClick?: () => void
  to?: string
  active?: boolean
}

interface AppShellProps {
  nav: NavItem[]
  /** Optional back link displayed above nav. */
  back?: { to: string; label: string }
  title: string
  subtitle?: string
  /** Top-right area in the main header (e.g. status pill, action buttons). */
  actions?: ReactNode
  children: ReactNode
}

function principalBadge(type: string | null) {
  switch (type) {
    case 'Agency':
      return { label: 'Super admin', tone: 'from-violet-500 to-fuchsia-500' }
    case 'Client':
      return { label: 'Klient', tone: 'from-sky-500 to-cyan-500' }
    default:
      return { label: 'EventPulse', tone: 'from-indigo-500 to-violet-500' }
  }
}

export function AppShell({ nav, back, title, subtitle, actions, children }: AppShellProps) {
  // Compact mode: a sidebar with a single self-referential link is just
  // wasted real estate, so we collapse the shell to a top-bar layout.
  // Triggered when there are no nav items or only one "active" item without
  // a back link.
  const compact = !back && (nav.length === 0 || (nav.length === 1 && nav[0]?.active))

  if (compact) {
    return <TopBarShell title={title} subtitle={subtitle} actions={actions}>{children}</TopBarShell>
  }

  return <SidebarShell nav={nav} back={back} title={title} subtitle={subtitle} actions={actions}>{children}</SidebarShell>
}

// ============== Compact "top bar" shell ==============
function TopBarShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const displayName = useAuthStore((s) => s.displayName)
  const principalType = useAuthStore((s) => s.principalType)
  const logout = useAuthStore((s) => s.logout)
  const badge = principalBadge(principalType)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      {/* Top bar — sticky, slim, glassy */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-6 py-3">
          {/* Brand */}
          <Link to="/events" className="flex items-center gap-2.5 outline-none">
            <Logo size={32} />
            <span className="hidden bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-lg font-extrabold tracking-tight text-transparent sm:inline">
              Event<span className="font-light italic">Pulse</span>
            </span>
          </Link>

          <span className="mx-1 hidden h-6 w-px bg-slate-800/80 sm:block" />

          {/* User pill (left of center area) */}
          <div className="hidden items-center gap-2 rounded-full border border-slate-800/80 bg-slate-900/60 py-1 pl-1 pr-3 md:inline-flex">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${badge.tone} text-[11px] font-semibold text-white`}>
              {(displayName ?? '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight text-white">{displayName}</p>
              <p className="text-[10px] leading-tight text-slate-500">{badge.label}</p>
            </div>
          </div>

          <span className="ml-auto" />

          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="rounded-md border border-slate-700/60 bg-slate-800/60 p-1.5 text-slate-300 hover:border-rose-400/40 hover:text-rose-300"
            aria-label={t('common.logout')}
            title={t('common.logout')}
          >
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </div>

        {/* Page title row */}
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-4 px-6 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-6 py-6">{children}</div>
    </div>
  )
}

// ============== Original sidebar shell (multi-item nav) ==============
function SidebarShell({
  nav,
  back,
  title,
  subtitle,
  actions,
  children,
}: AppShellProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const displayName = useAuthStore((s) => s.displayName)
  const principalType = useAuthStore((s) => s.principalType)
  const logout = useAuthStore((s) => s.logout)
  const badge = principalBadge(principalType)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start overflow-y-auto border-r border-slate-800/80 bg-slate-950/40 backdrop-blur-md md:flex">
        <div className="flex items-center gap-3 border-b border-slate-800/80 px-5 py-5">
          <Logo size={36} />
          <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
            Event<span className="font-light italic">Pulse</span>
          </span>
        </div>

        {back && (
          <Link
            to={back.to}
            className="mx-3 mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          >
            <Icon name="chevronLeft" className="h-4 w-4" />
            {back.label}
          </Link>
        )}

        <p className="mt-4 px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">{t('app.menu')}</p>
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const className = `flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              item.active
                ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-white shadow-inner shadow-indigo-500/20 ring-1 ring-inset ring-indigo-400/30'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
            }`
            const content = (
              <>
                <Icon name={item.icon} className="h-4 w-4" />
                <span>{item.label}</span>
              </>
            )
            return item.to ? (
              <Link key={item.id} to={item.to} className={className}>
                {content}
              </Link>
            ) : (
              <button key={item.id} type="button" onClick={item.onClick} className={className}>
                {content}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-slate-800/80 p-3">
          <div className="flex items-center gap-3 rounded-lg bg-slate-900/60 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-semibold text-white">
              {(displayName ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{displayName}</p>
              <p className="text-[11px] text-slate-500">{badge.label}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
              aria-label={t('common.logout')}
              title={t('common.logout')}
            >
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <LanguageSwitcher />
          </div>
        </div>
      </aside>

      <main className="flex-1">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/60 px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  )
}
