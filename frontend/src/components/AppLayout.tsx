import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../stores/authStore'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Button } from './ui'

export function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const displayName = useAuthStore((s) => s.displayName)
  const logout = useAuthStore((s) => s.logout)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-indigo-600">{t('app.name')}</span>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <span className="text-sm text-slate-600">{displayName}</span>
            <Button variant="ghost" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
