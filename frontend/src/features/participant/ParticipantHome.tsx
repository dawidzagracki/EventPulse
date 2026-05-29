import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useMyAgenda,
  useMyProfile,
  useMyTransfers,
  useSubmitFeedback,
  useUpdateConsents,
  useUpdatePreferences,
} from './api'
import { useAuthStore } from '../../stores/authStore'
import { Button, Card, Field, Input } from '../../components/ui'
import { LanguageSwitcher } from '../../components/LanguageSwitcher'
import { AgendaItemTypeName, type MyProfileDto, type QuizTakeDto } from '../../types/api'
import { getQuizTake, submitQuiz, useAddContact, useMyContacts, useMyQuizzes } from '../engagement/api'

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
                <LogisticsSection profile={profile} />
                <AgendaSection />
                <QuizzesSection />
                <NetworkingSection />
                <FeedbackSection />
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

function LogisticsSection({ profile }: { profile: MyProfileDto }) {
  const { t } = useTranslation()
  const { data: transfers } = useMyTransfers()

  const hasInfo = profile.tableName || profile.roomNumber || profile.hotelName
  if (!hasInfo && (!transfers || transfers.length === 0)) {
    return null
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('logistics.title')}</h2>
      <div className="space-y-1 text-sm">
        {profile.tableName && (
          <p>
            <span className="text-slate-500">{t('logistics.table')}:</span> {profile.tableName}
          </p>
        )}
        {profile.roomNumber && (
          <p>
            <span className="text-slate-500">{t('logistics.room')}:</span> {profile.roomNumber}
            {profile.hotelName ? ` · ${profile.hotelName}` : ''}
            {profile.hotelAddress ? ` · ${profile.hotelAddress}` : ''}
          </p>
        )}
        {profile.hotelPhone && (
          <p>
            <span className="text-slate-500">{t('logistics.reception')}:</span> {profile.hotelPhone}
          </p>
        )}
      </div>
      {transfers && transfers.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {transfers.map((tr) => (
            <li key={tr.id} className="rounded-lg border border-slate-100 p-2">
              <span className="font-medium">{tr.name}</span> · {new Date(tr.departureTime).toLocaleString()} ·{' '}
              {tr.meetingPoint}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function QuizzesSection() {
  const { t } = useTranslation()
  const { data: quizzes } = useMyQuizzes()
  const [take, setTake] = useState<QuizTakeDto | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [score, setScore] = useState<number | null>(null)

  if (!quizzes || quizzes.length === 0) return null

  async function open(quizId: string) {
    setScore(null)
    setAnswers({})
    setTake(await getQuizTake(quizId))
  }

  async function send() {
    if (!take) return
    const result = await submitQuiz(take.quizId, answers)
    setScore(result.score)
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('engagement.quizzes')}</h2>
      {!take ? (
        <ul className="space-y-1 text-sm">
          {quizzes.map((q) => (
            <li key={q.id} className="flex items-center justify-between">
              <span>{q.title}</span>
              <Button variant="ghost" onClick={() => open(q.id)}>
                {t('engagement.takeQuiz')}
              </Button>
            </li>
          ))}
        </ul>
      ) : score !== null ? (
        <div className="space-y-2">
          <p className="font-medium">
            {t('engagement.yourScore')}: {score} / {take.questions.length}
          </p>
          <Button variant="ghost" onClick={() => setTake(null)}>
            {t('common.cancel')}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="font-semibold">{take.title}</p>
          {take.questions.map((q) => (
            <div key={q.id}>
              <p className="text-sm font-medium">{q.text}</p>
              {q.options.map((opt, i) => (
                <label key={i} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ))}
          <Button onClick={send}>{t('engagement.submitQuiz')}</Button>
        </div>
      )}
    </Card>
  )
}

function NetworkingSection() {
  const { t } = useTranslation()
  const { data: contacts } = useMyContacts()
  const add = useAddContact()
  const [token, setToken] = useState('')

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    const match = token.trim().match(/[0-9a-f-]{36}/i)
    if (!match) return
    await add.mutateAsync(match[0])
    setToken('')
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('engagement.networking')}</h2>
      <form onSubmit={addContact} className="mb-3 flex gap-2">
        <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder={t('engagement.scanToken')} />
        <Button type="submit" disabled={add.isPending}>
          {t('engagement.addContact')}
        </Button>
      </form>
      {add.isError && <p className="mb-2 text-sm text-red-600">{t('engagement.contactError')}</p>}
      <ul className="space-y-1 text-sm">
        {(contacts ?? []).map((c, i) => (
          <li key={i} className="flex justify-between">
            <span>{c.name}</span>
            <span className="text-slate-500">{c.email}</span>
          </li>
        ))}
        {(contacts ?? []).length === 0 && <li className="text-slate-500">{t('engagement.noContacts')}</li>}
      </ul>
    </Card>
  )
}

function FeedbackSection() {
  const { t } = useTranslation()
  const submit = useSubmitFeedback()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (rating < 1) return
    await submit.mutateAsync({ rating, comment: comment || null })
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('feedback.title')}</h2>
      {submit.isSuccess ? (
        <p className="text-sm text-emerald-700">{t('feedback.thanks')}</p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`text-2xl ${n <= rating ? 'text-amber-400' : 'text-slate-300'}`}
                aria-label={`${n}`}
              >
                ★
              </button>
            ))}
          </div>
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('feedback.comment')} />
          <Button type="submit" disabled={rating < 1 || submit.isPending}>
            {t('feedback.send')}
          </Button>
        </form>
      )}
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
