import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMyAgenda, useMyProfile, useUpdateConsents, useUpdatePreferences } from './api'
import { useAuthStore } from '../../stores/authStore'
import { Button, Card, Field, Input } from '../../components/ui'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { AgendaItemTypeName, type MyProfileDto } from '../../types/api'

export function ParticipantHome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const { data: profile, isLoading } = useMyProfile()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-indigo-600">{t('app.name')}</span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={handleLogout}>
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {isLoading || !profile ? (
          <p className="text-slate-500">{t('common.loading')}</p>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{t('participant.hello', { name: profile.firstName })}</h1>
            {/* key forces a fresh form when the profile identity changes */}
            <ConsentsSection key={`consents-${profile.id}`} profile={profile} />
            {profile.hasAcceptedRodo && (
              <>
                <PreferencesSection key={`prefs-${profile.id}`} profile={profile} />
                <AgendaSection />
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function ConsentsSection({ profile }: { profile: MyProfileDto }) {
  const { t } = useTranslation()
  const update = useUpdateConsents()

  const [rodo, setRodo] = useState(profile.hasAcceptedRodo)
  const [photo, setPhoto] = useState(profile.photoConsent)
  const [networking, setNetworking] = useState(profile.networkingConsent)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await update.mutateAsync({ rodoAccepted: rodo, photoConsent: photo, networkingConsent: networking })
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('participant.consents')}</h2>
      <form onSubmit={save} className="space-y-2 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={rodo} onChange={(e) => setRodo(e.target.checked)} className="mt-1" />
          <span>{t('participant.rodo')} *</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={photo} onChange={(e) => setPhoto(e.target.checked)} className="mt-1" />
          <span>{t('participant.photo')}</span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={networking}
            onChange={(e) => setNetworking(e.target.checked)}
            className="mt-1"
          />
          <span>{t('participant.networking')}</span>
        </label>
        <Button type="submit" disabled={!rodo || update.isPending}>
          {t('common.save')}
        </Button>
      </form>
    </Card>
  )
}

function PreferencesSection({ profile }: { profile: MyProfileDto }) {
  const { t, i18n } = useTranslation()
  const update = useUpdatePreferences()

  const [language, setLanguage] = useState(profile.language)
  const [dietary, setDietary] = useState(profile.dietaryPreferences ?? '')
  const [shirt, setShirt] = useState(profile.shirtSize ?? '')
  const [wishes, setWishes] = useState(profile.wishes ?? '')
  const [transfer, setTransfer] = useState(profile.airportTransfer)
  const [arrival, setArrival] = useState(profile.arrivalTime ?? '')
  const [flight, setFlight] = useState(profile.flightNumber ?? '')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    await update.mutateAsync({
      language,
      dietaryPreferences: dietary || null,
      shirtSize: shirt || null,
      wishes: wishes || null,
      airportTransfer: transfer,
      arrivalTime: arrival || null,
      flightNumber: flight || null,
    })
    void i18n.changeLanguage(language)
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('participant.preferences')}</h2>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field label={t('participant.language')}>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="pl">PL</option>
            <option value="en">EN</option>
          </select>
        </Field>
        <Field label={t('participant.dietary')}>
          <Input value={dietary} onChange={(e) => setDietary(e.target.value)} />
        </Field>
        <Field label={t('participant.shirt')}>
          <Input value={shirt} onChange={(e) => setShirt(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={transfer} onChange={(e) => setTransfer(e.target.checked)} />
          {t('participant.transfer')}
        </label>
        {transfer && (
          <>
            <Field label={t('participant.arrival')}>
              <Input value={arrival} onChange={(e) => setArrival(e.target.value)} placeholder="14:30" />
            </Field>
            <Field label={t('participant.flight')}>
              <Input value={flight} onChange={(e) => setFlight(e.target.value)} placeholder="LO245" />
            </Field>
          </>
        )}
        <div className="sm:col-span-2">
          <Field label={t('participant.wishes')}>
            <Input value={wishes} onChange={(e) => setWishes(e.target.value)} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={update.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function AgendaSection() {
  const { t, i18n } = useTranslation()
  const { data: items, isLoading } = useMyAgenda()
  const isEn = (i18n.resolvedLanguage ?? 'pl') === 'en'

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('agenda.title')}</h2>
      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (items ?? []).length === 0 ? (
        <p className="text-slate-500">{t('agenda.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {(items ?? []).map((item) => (
            <li key={item.id} className="rounded-lg border border-slate-100 p-3">
              <p className="font-medium">{isEn ? item.titleEn : item.titlePl}</p>
              <p className="text-sm text-slate-500">
                {new Date(item.startsAt).toLocaleString()} · {AgendaItemTypeName[item.type]}
                {item.locationName ? ` · ${item.locationName}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
