import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

/**
 * Universal, self-service login page (second login path). A guest enters their e-mail and, if it
 * matches a participant of this event, their personal token link is e-mailed to them. The response
 * is always generic — we never reveal whether an address is registered.
 *
 * When the event has OPEN SELF-REGISTRATION enabled the same form also collects a name: an unknown
 * e-mail then registers a brand-new participant and mails them their personal link.
 */
export function RequestLinkPage() {
  const { eventId = '' } = useParams()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  // null = still loading the event context; false/true = self-registration flag.
  const [selfReg, setSelfReg] = useState<boolean | null>(null)
  const [eventName, setEventName] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    axios
      .get(`${baseURL}/api/public/events/${eventId}`)
      .then((r) => {
        if (!alive) return
        setSelfReg(!!r.data?.allowSelfRegistration)
        setEventName(r.data?.name ?? null)
      })
      .catch(() => {
        if (alive) setSelfReg(false) // unknown event → plain login-link form
      })
    return () => {
      alive = false
    }
  }, [eventId])

  const namesOk = !selfReg || (firstName.trim().length > 0 && lastName.trim().length > 0)
  const canSubmit = !!email.trim() && namesOk && !busy

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    try {
      await axios.post(`${baseURL}/api/public/events/${eventId}/request-link`, {
        email: email.trim(),
        firstName: selfReg ? firstName.trim() : undefined,
        lastName: selfReg ? lastName.trim() : undefined,
      })
    } catch {
      // Ignore — the response is intentionally generic.
    }
    setSent(true)
    setBusy(false)
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fbfbfd] p-6 text-slate-900">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-end">
          <LanguageSwitcher />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
          <h1 className="text-xl font-bold text-slate-900">
            {selfReg ? t('plogin.registerTitle') : t('plogin.title')}
          </h1>
          {eventName && <p className="mt-0.5 text-sm font-medium text-indigo-600">{eventName}</p>}
          {sent ? (
            <div className="mt-3">
              <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                ✓ {selfReg ? t('plogin.registeredSent') : t('plogin.sent')}
              </p>
              <p className="mt-3 text-xs text-slate-500">{t('plogin.sentHint')}</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-3 space-y-3">
              <p className="text-sm text-slate-600">
                {selfReg ? t('plogin.registerPrompt') : t('plogin.prompt')}
              </p>
              {selfReg && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('plogin.firstName')}
                    className={inputCls}
                  />
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('plogin.lastName')}
                    className={inputCls}
                  />
                </div>
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('plogin.emailPlaceholder')}
                className={inputCls}
              />
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50"
              >
                {busy ? '…' : selfReg ? t('plogin.register') : t('plogin.send')}
              </button>
              {selfReg && <p className="text-xs text-slate-400">{t('plogin.registerNote')}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
