import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Field, Input } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useCreateEvent } from './api'

interface SmartEventFormProps {
  onCancel: () => void
  onCreated: () => void
}

/**
 * Renders a value (Date) into the `<input type="datetime-local">` string
 * format: `YYYY-MM-DDTHH:mm` in LOCAL time (the input does not understand
 * ISO with TZ).
 */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(s: string): Date | null {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const DEFAULT_DURATION_MS = 4 * 60 * 60 * 1000 // 4 hours

function nextAt(daysAhead: number, hour: number, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(hour, minute, 0, 0)
  return d
}

function nextWeekend(): Date {
  // Saturday at 18:00 — closest upcoming Saturday (today if it's Saturday morning).
  const d = new Date()
  const dow = d.getDay() // 0 = Sun, 6 = Sat
  const daysToSat = dow === 6 ? 0 : (6 - dow + 7) % 7
  d.setDate(d.getDate() + daysToSat)
  d.setHours(18, 0, 0, 0)
  return d
}

export function SmartEventForm({ onCancel, onCreated }: SmartEventFormProps) {
  const { t, i18n } = useTranslation()
  const createEvent = useCreateEvent()

  // Smart defaults: tomorrow 18:00 → +4h, so the user sees a complete preview
  // immediately on open and can just type a name + click create.
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [startsAt, setStartsAt] = useState(() => toLocalInputValue(nextAt(1, 18)))
  // When the user hasn't touched the end field, we *derive* it from start
  // (+4h) so we don't have to coordinate two pieces of state in an effect.
  // Once touched, we store the user's value verbatim.
  const [endsAtOverride, setEndsAtOverride] = useState<string | null>(null)
  const endTouched = endsAtOverride !== null

  const startDate = fromLocalInputValue(startsAt)
  const derivedEnd = startDate ? toLocalInputValue(new Date(startDate.getTime() + DEFAULT_DURATION_MS)) : ''
  const endsAt = endsAtOverride ?? derivedEnd
  const endDate = fromLocalInputValue(endsAt)
  const durationMs = startDate && endDate ? endDate.getTime() - startDate.getTime() : 0
  const validEnd = durationMs > 0
  const validEmail = !clientEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)
  const canSubmit = name.trim().length > 0 && validEnd && validEmail && !createEvent.isPending

  function applyPreset(start: Date) {
    setStartsAt(toLocalInputValue(start))
    setEndsAtOverride(null) // back to derived end
  }

  const presets = useMemo(
    () => [
      { key: 'tonight', label: t('events.presetTonight'), date: nextAt(0, 19) },
      { key: 'tomorrow', label: t('events.presetTomorrow'), date: nextAt(1, 9) },
      { key: 'weekend', label: t('events.presetWeekend'), date: nextWeekend() },
      { key: 'nextWeek', label: t('events.presetNextWeek'), date: nextAt(7, 10) },
    ],
    [t],
  )

  const durationLabel = useMemo(() => {
    if (durationMs <= 0) return null
    const days = Math.floor(durationMs / 86_400_000)
    const hours = Math.floor((durationMs / 3_600_000) % 24)
    const minutes = Math.floor((durationMs / 60_000) % 60)
    const parts: string[] = []
    if (days > 0) parts.push(`${days} ${t('dashboard.days')}`)
    if (hours > 0) parts.push(`${hours} ${t('dashboard.hours')}`)
    if (minutes > 0 && days === 0) parts.push(`${minutes} ${t('dashboard.minutes')}`)
    return parts.join(' ')
  }, [durationMs, t])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !startDate || !endDate) return
    await createEvent.mutateAsync({
      name: name.trim(),
      startsAt: startDate.toISOString(),
      endsAt: endDate.toISOString(),
      location: location.trim() || null,
      clientEmail: clientEmail.trim() || null,
    })
    onCreated()
  }

  return (
    <Card glow className="mt-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-[-5rem] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
            <Icon name="sparkles" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-white">{t('events.new')}</p>
            <p className="text-xs text-slate-400">{t('events.newWizardLead')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ───────── Section: Basics ───────── */}
          <FormSection title={t('events.sectionBasics')}>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <Field label={t('events.name')}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder={t('events.namePlaceholder')}
                />
                <p className="mt-1 text-[11px] text-slate-500">{t('events.nameHint')}</p>
              </Field>
              <Field label={t('events.location')}>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t('events.locationPlaceholder')}
                />
              </Field>
            </div>
          </FormSection>

          {/* ───────── Section: When ───────── */}
          <FormSection title={t('events.sectionWhen')}>
            {/* Quick presets */}
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                {t('events.quickPresets')}
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                  const matches = startDate && Math.abs(startDate.getTime() - p.date.getTime()) < 60_000
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => applyPreset(p.date)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        matches
                          ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-white ring-1 ring-inset ring-indigo-400/40'
                          : 'border border-slate-800/70 bg-slate-900/40 text-slate-300 hover:border-indigo-400/30 hover:bg-slate-900 hover:text-white'
                      }`}
                    >
                      <Icon name="calendar" className="h-3 w-3" />
                      {p.label}
                      <span className="text-[10px] opacity-60">
                        {p.date.toLocaleDateString(i18n.language, { day: '2-digit', month: 'short' })}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('events.starts')}>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  required
                />
              </Field>
              <Field label={`${t('events.ends')} ${!endTouched ? t('events.endAuto') : ''}`.trim()}>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAtOverride(e.target.value)}
                  required
                  className={validEnd ? '' : '!border-rose-500/60 !ring-rose-500/20'}
                />
                {!validEnd ? (
                  <p className="mt-1 text-[11px] text-rose-300">{t('events.endBeforeStart')}</p>
                ) : (
                  durationLabel && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      <span className="text-slate-500">{t('events.durationLabel')}</span>{' '}
                      <span className="font-medium text-emerald-300">{durationLabel}</span>
                    </p>
                  )
                )}
              </Field>
            </div>
          </FormSection>

          {/* ───────── Section: Client ───────── */}
          <FormSection title={t('events.sectionClient')}>
            <Field label={t('events.clientEmail')}>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder={t('events.clientEmailPlaceholder')}
                className={validEmail ? '' : '!border-rose-500/60 !ring-rose-500/20'}
              />
              {!validEmail && <p className="mt-1 text-[11px] text-rose-300">{t('events.invalidEmail')}</p>}
            </Field>
          </FormSection>

          {/* Footer */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4">
            <Button type="submit" disabled={!canSubmit}>
              <Icon name="check" className="h-4 w-4" />
              {createEvent.isPending ? '…' : t('common.create')}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            {!canSubmit && name.trim() === '' && (
              <span className="ml-2 text-[11px] text-slate-500">Wypełnij nazwę, żeby kontynuować</span>
            )}
          </div>
        </form>
      </div>
    </Card>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1 w-5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">{title}</h3>
      </div>
      {children}
    </div>
  )
}
