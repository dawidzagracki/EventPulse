import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCreateEvent, useEvents } from './api'
import { AppShell, type NavItem } from '../../components/AppShell'
import { Badge, Button, Card, Field, Input } from '../../components/ui'
import { EventStatus, EventStatusName } from '../../types/api'

function statusTone(status: number) {
  switch (status) {
    case EventStatus.Live:
      return 'success' as const
    case EventStatus.Published:
      return 'info' as const
    case EventStatus.Completed:
      return 'accent' as const
    case EventStatus.Archived:
      return 'default' as const
    default:
      return 'warning' as const
  }
}

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

  const nav: NavItem[] = [
    { id: 'events', label: t('events.title'), icon: 'calendar', to: '/events', active: true },
  ]

  return (
    <AppShell
      nav={nav}
      title={t('events.title')}
      subtitle={t('events.subtitle')}
      actions={<Button onClick={() => setShowForm((v) => !v)}>+ {t('events.new')}</Button>}
    >
      {showForm && (
        <Card glow className="mb-6">
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
            <div className="flex gap-2 sm:col-span-2">
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
          <p className="text-slate-400">{t('events.empty')}</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((ev) => (
            <Link key={ev.id} to={`/events/${ev.id}`} className="group">
              <Card className="transition group-hover:border-indigo-400/40 group-hover:bg-slate-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{ev.name}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(ev.startsAt).toLocaleString()} · <span className="text-slate-500">/{ev.slug}</span>
                    </p>
                  </div>
                  <Badge tone={statusTone(ev.status)}>
                    {t(`status.${ev.status}`)} · {EventStatusName[ev.status]}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  )
}
