import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEvent, useUpdateEmailBranding, fetchEmailPreview } from './api'
import { Button, Card, Field, Input } from '../../components/ui'
import { ColorPicker } from '../../components/ColorPicker'
import type { EventDto } from '../../types/api'

/**
 * Per-event transactional e-mail branding: accent colour + logo shown in the header of the
 * invitation / login-link / client-links e-mails, alongside the event name. A live preview
 * (rendered by the API, so it matches the real e-mail exactly) updates as you edit.
 */
export function EmailBrandingTab({ eventId }: { eventId: string }) {
  const { data: event, isLoading } = useEvent(eventId)
  if (isLoading || !event) return <p className="text-slate-500">Ładowanie…</p>
  return <EmailBrandingForm key={event.updatedAt ?? event.id} eventId={eventId} event={event} />
}

function EmailBrandingForm({ eventId, event }: { eventId: string; event: EventDto }) {
  const { t } = useTranslation()
  const update = useUpdateEmailBranding(eventId)

  const [accent, setAccent] = useState<string | null>(event.emailBranding.accentColor)
  const [logo, setLogo] = useState(event.emailBranding.logoUrl ?? '')
  const [headerName, setHeaderName] = useState(event.emailBranding.headerName ?? '')

  const dirty =
    accent !== event.emailBranding.accentColor ||
    (logo || null) !== event.emailBranding.logoUrl ||
    (headerName.trim() || null) !== event.emailBranding.headerName

  async function save() {
    await update.mutateAsync({
      accentColor: accent,
      logoUrl: logo.trim() || null,
      headerName: headerName.trim() || null,
    })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-5">
        <Card glow>
          <h3 className="text-base font-semibold text-white">{t('emailBranding.title')}</h3>
          <p className="mt-1 text-sm text-slate-400">{t('emailBranding.intro')}</p>

          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                {t('emailBranding.accent')}
              </p>
              {accent ? (
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <ColorPicker value={accent} onChange={setAccent} swatches={[event.emailBranding.accentColor ?? '#6d28d9']} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setAccent(null)}
                    className="shrink-0 rounded-md border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:text-white"
                  >
                    {t('emailBranding.accentDefault')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAccent('#6d28d9')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-sm text-slate-200 transition hover:text-white"
                >
                  <span className="h-4 w-4 rounded" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed,#d946ef)' }} />
                  {t('emailBranding.accentSet')}
                </button>
              )}
              {!accent && <p className="mt-1.5 text-xs text-slate-500">{t('emailBranding.accentHint')}</p>}
            </div>

            <Field label={t('emailBranding.headerName')}>
              <Input
                type="text"
                maxLength={80}
                placeholder="EventPulse"
                value={headerName}
                onChange={(e) => setHeaderName(e.target.value)}
              />
            </Field>
            <p className="-mt-2 text-xs text-slate-500">{t('emailBranding.headerNameHint')}</p>

            <Field label={t('emailBranding.logo')}>
              <Input
                type="url"
                placeholder="https://twojafirma.pl/logo.png"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
              />
            </Field>
            <p className="-mt-2 text-xs text-slate-500">{t('emailBranding.logoHint')}</p>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Button onClick={save} disabled={!dirty || update.isPending}>
              {update.isPending ? 'Zapisywanie…' : t('emailBranding.save')}
            </Button>
            {update.isSuccess && !dirty && <span className="text-sm text-emerald-400">✓ Zapisano</span>}
            {update.isError && <span className="text-sm text-rose-400">Nie udało się zapisać.</span>}
          </div>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{t('emailBranding.preview')}</p>
        <EmailPreview eventId={eventId} accent={accent} logo={logo.trim() || null} header={headerName.trim() || null} />
      </div>
    </div>
  )
}

function EmailPreview({
  eventId,
  accent,
  logo,
  header,
}: {
  eventId: string
  accent: string | null
  logo: string | null
  header: string | null
}) {
  const [html, setHtml] = useState<string>('')
  // Debounce so dragging the colour picker / typing doesn't hammer the API.
  const key = useMemo(() => `${accent ?? ''}|${logo ?? ''}|${header ?? ''}`, [accent, logo, header])

  useEffect(() => {
    let alive = true
    const id = window.setTimeout(() => {
      fetchEmailPreview(eventId, accent, logo, header)
        .then((h) => alive && setHtml(h))
        .catch(() => {})
    }, 350)
    return () => {
      alive = false
      window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, key])

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-white shadow-xl">
      <iframe title="email-preview" srcDoc={html} className="h-[560px] w-full border-0" sandbox="" />
    </div>
  )
}
