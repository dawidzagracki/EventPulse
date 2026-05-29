import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCreateEvent, useEvents } from './api'
import { Button, Card, Field, Input } from '../../components/ui'
import { EventStatusName } from '../../types/api'

export function EventsListPage() {
  const { t } = useTranslation()
  const { data: events, isLoading } = useEvents()
  const createEvent = useCreateEvent()
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [location, setLocation] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    await createEvent.mutateAsync({
      name,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      location: location || null,
      clientEmail: clientEmail || null,
    })
    setShowForm(false)
    setName('')
    setStartsAt('')
    setEndsAt('')
    setLocation('')
    setClientEmail('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('events.title')}</h1>
        <Button onClick={() => setShowForm((v) => !v)}>{t('events.new')}</Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t('events.name')}>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
            </div>
            <Field label={t('events.starts')}>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </Field>
            <Field label={t('events.ends')}>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
            </Field>
            <Field label={t('events.location')}>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </Field>
            <Field label={t('events.clientEmail')}>
              <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
            </Field>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={createEvent.isPending}>
                {t('common.create')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : !events || events.length === 0 ? (
        <Card>
          <p className="text-slate-500">{t('events.empty')}</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {events.map((ev) => (
            <Link key={ev.id} to={`/events/${ev.id}`}>
              <Card className="flex items-center justify-between transition hover:border-indigo-300 hover:shadow">
                <div>
                  <p className="font-semibold">{ev.name}</p>
                  <p className="text-sm text-slate-500">
                    {new Date(ev.startsAt).toLocaleString()} · /{ev.slug}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {t(`status.${ev.status}`)} ({EventStatusName[ev.status]})
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
