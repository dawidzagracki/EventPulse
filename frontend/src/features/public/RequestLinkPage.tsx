import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

/**
 * Universal, self-service login page (second login path). A guest enters their e-mail and, if it
 * matches a participant of this event, their personal token link is e-mailed to them. The response
 * is always generic — we never reveal whether an address is registered.
 */
export function RequestLinkPage() {
  const { eventId = '' } = useParams()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || busy) return
    setBusy(true)
    try {
      await axios.post(`${baseURL}/api/public/events/${eventId}/request-link`, { email: email.trim() })
    } catch {
      // Ignore — the response is intentionally generic.
    }
    setSent(true)
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfd] p-6 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-end">
          <LanguageSwitcher />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
          <h1 className="text-xl font-bold text-slate-900">{t('plogin.title')}</h1>
          {sent ? (
            <div className="mt-3">
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                ✓ {t('plogin.sent')}
              </p>
              <p className="mt-3 text-xs text-slate-500">{t('plogin.sentHint')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-3 space-y-3">
              <p className="text-sm text-slate-600">{t('plogin.prompt')}</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('plogin.emailPlaceholder')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
              >
                {busy ? '…' : t('plogin.send')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
