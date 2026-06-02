import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvent } from './api'
import { prettifyEventName } from './eventName'
import { ParticipantsTab } from '../participants/ParticipantsTab'
import { AgendaTab } from '../agenda/AgendaTab'
import { PageBuilderTab } from '../content/PageBuilderTab'
import { DashboardTab } from '../dashboard/DashboardTab'
import { LogisticsTab } from '../logistics/LogisticsTab'
import { EngagementTab } from '../engagement/EngagementTab'
import { GalleryTab } from '../gallery/GalleryTab'
import { AuditTab } from '../audit/AuditTab'
import { AppShell, type NavItem } from '../../components/AppShell'
import { Badge, Card } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { EventStatus, EventStatusName } from '../../types/api'

type Tab =
  | 'dashboard'
  | 'overview'
  | 'participants'
  | 'agenda'
  | 'page'
  | 'logistics'
  | 'engagement'
  | 'gallery'
  | 'audit'

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

export function EventDetailPage() {
  const { eventId = '' } = useParams()
  const { t } = useTranslation()
  const { data: event, isLoading } = useEvent(eventId)
  const [tab, setTab] = useState<Tab>('dashboard')

  const nav: NavItem[] = (
    [
      { id: 'dashboard', label: t('dashboard.title'), icon: 'dashboard' },
      { id: 'overview', label: t('eventDetail.overview'), icon: 'document' },
      { id: 'participants', label: t('participants.title'), icon: 'users' },
      { id: 'agenda', label: t('agenda.title'), icon: 'calendar' },
      { id: 'page', label: t('page.title'), icon: 'document' },
      { id: 'logistics', label: t('logistics.title'), icon: 'truck' },
      { id: 'engagement', label: t('engagement.title'), icon: 'bolt' },
      { id: 'gallery', label: t('gallery.title'), icon: 'image' },
      { id: 'audit', label: t('audit.title'), icon: 'shield' },
    ] as { id: Tab; label: string; icon: NavItem['icon'] }[]
  ).map((item) => ({ ...item, active: tab === item.id, onClick: () => setTab(item.id) }))

  const actions = event ? (
    <>
      <Badge tone={statusTone(event.status)}>
        {t(`status.${event.status}`)} · {EventStatusName[event.status]}
      </Badge>
      <Link
        to={`/events/${eventId}/scanner`}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
      >
        <Icon name="qr" className="h-4 w-4" />
        {t('scanner.title')}
      </Link>
    </>
  ) : null

  return (
    <AppShell
      nav={nav}
      back={{ to: '/events', label: t('events.title') }}
      title={event ? prettifyEventName(event.name).display : t('common.loading')}
      subtitle={event ? `/${event.slug}` : undefined}
      actions={actions}
    >
      {isLoading || !event ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (
        <>
          {tab === 'overview' && (
            <Card className="grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="text-slate-500">{t('events.starts')}:</span>{' '}
                <span className="text-slate-100">{new Date(event.startsAt).toLocaleString()}</span>
              </p>
              <p>
                <span className="text-slate-500">{t('events.ends')}:</span>{' '}
                <span className="text-slate-100">{new Date(event.endsAt).toLocaleString()}</span>
              </p>
              <p>
                <span className="text-slate-500">{t('events.location')}:</span>{' '}
                <span className="text-slate-100">{event.location ?? '—'}</span>
              </p>
              <p>
                <span className="text-slate-500">{t('events.clientEmail')}:</span>{' '}
                <span className="text-slate-100">{event.clientEmail ?? '—'}</span>
              </p>
            </Card>
          )}
          {tab === 'participants' && <ParticipantsTab eventId={eventId} />}
          {tab === 'agenda' && <AgendaTab eventId={eventId} />}
          {tab === 'page' && <PageBuilderTab eventId={eventId} />}
          {tab === 'logistics' && <LogisticsTab eventId={eventId} />}
          {tab === 'engagement' && <EngagementTab eventId={eventId} />}
          {tab === 'gallery' && <GalleryTab eventId={eventId} />}
          {tab === 'dashboard' && <DashboardTab eventId={eventId} />}
          {tab === 'audit' && <AuditTab />}
        </>
      )}
    </AppShell>
  )
}
