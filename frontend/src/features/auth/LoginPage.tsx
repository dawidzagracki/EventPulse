import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from './api'
import { useAuthStore } from '../../stores/authStore'
import { Button, Card, Field, Input } from '../../components/ui'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'

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

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600">{t('app.name')}</h1>
          <LanguageSwitcher />
        </div>
        <h2 className="mb-4 text-lg font-semibold">{t('auth.loginTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('auth.email')}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label={t('auth.password')}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? t('common.loading') : t('auth.login')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
