import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvent } from './api'
import { ParticipantsTab } from '../participants/ParticipantsTab'
import { AgendaTab } from '../agenda/AgendaTab'
import { Card } from '../../components/ui'
import { EventStatusName } from '../../types/api'

type Tab = 'overview' | 'participants' | 'agenda'

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const { t } = useTranslation()
  const { data: event, isLoading } = useEvent(eventId)
  const [tab, setTab] = useState<Tab>('overview')

  if (isLoading) return <p className="text-slate-500">{t('common.loading')}</p>
  if (!event) return <p className="text-slate-500">{t('common.error')}</p>

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('eventDetail.overview') },
    { id: 'participants', label: t('participants.title') },
    { id: 'agenda', label: t('agenda.title') },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link to="/events" className="text-sm text-indigo-600 hover:underline">
          ← {t('events.title')}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{event.name}</h1>
        <p className="text-sm text-slate-500">
          /{event.slug} · {EventStatusName[event.status]}
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === tabItem.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <Card className="space-y-1 text-sm">
          <p>
            <span className="text-slate-500">{t('events.starts')}:</span> {new Date(event.startsAt).toLocaleString()}
          </p>
          <p>
            <span className="text-slate-500">{t('events.ends')}:</span> {new Date(event.endsAt).toLocaleString()}
          </p>
          <p>
            <span className="text-slate-500">{t('events.location')}:</span> {event.location ?? '—'}
          </p>
          <p>
            <span className="text-slate-500">{t('events.clientEmail')}:</span> {event.clientEmail ?? '—'}
          </p>
        </Card>
      )}
      {tab === 'participants' && <ParticipantsTab eventId={eventId} />}
      {tab === 'agenda' && <AgendaTab eventId={eventId} />}
    </div>
  )
}
