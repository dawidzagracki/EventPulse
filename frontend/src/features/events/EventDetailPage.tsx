import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEvent, useDeleteEvent } from './api'
import { prettifyEventName } from './eventName'
import { OverviewTab } from './OverviewTab'
import { ParticipantsTab } from '../participants/ParticipantsTab'
import { AgendaTab } from '../agenda/AgendaTab'
import { PageBuilderTab } from '../content/PageBuilderTab'
import { DashboardTab } from '../dashboard/DashboardTab'
import { LogisticsTab } from '../logistics/LogisticsTab'
import { EngagementTab } from '../engagement/EngagementTab'
import { GalleryTab } from '../gallery/GalleryTab'
import { AuditTab } from '../audit/AuditTab'
import { AppShell, type NavItem } from '../../components/AppShell'
import { Badge } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useAuthStore } from '../../stores/authStore'
import { EventStatus, EventStatusName } from '../../types/api'

// Clients get a focused subset — the tabs they actually care about when
// reviewing their event. Agency staff see everything.
const CLIENT_TABS: Tab[] = ['dashboard', 'overview', 'page', 'participants', 'gallery']

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
  const navigate = useNavigate()
  const { data: event, isLoading } = useEvent(eventId)
  const principalType = useAuthStore((s) => s.principalType)
  const isClient = principalType === 'Client'
  const deleteEvent = useDeleteEvent(eventId)
  const [tab, setTab] = useState<Tab>('dashboard')

  async function handleDelete() {
    if (!window.confirm(t('events.deleteConfirm'))) return
    await deleteEvent.mutateAsync()
    navigate('/events', { replace: true })
  }

  const allTabs = [
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

  const visibleTabs = isClient ? allTabs.filter((x) => CLIENT_TABS.includes(x.id)) : allTabs
  // Guard against a stale/hidden tab (e.g. client lands with a non-client tab).
  const activeTab = visibleTabs.some((x) => x.id === tab) ? tab : 'dashboard'

  const nav: NavItem[] = visibleTabs.map((item) => ({
    ...item,
    active: activeTab === item.id,
    onClick: () => setTab(item.id),
  }))

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
      {!isClient && (
        <button
          onClick={async () => {
            try {
              const res = await fetch(
                `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}/api/events/${eventId}/operator-link`,
                {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` },
                },
              )
              if (!res.ok) throw new Error()
              const data = await res.json() as { accessToken: string }
              const url = `${window.location.origin}/op/${data.accessToken}`
              await navigator.clipboard.writeText(url)
              alert(`Link operatora skopiowany do schowka:\n${url}`)
            } catch {
              alert('Nie udało się wygenerować linku operatora.')
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
          title="Wygeneruj link dla hostessy / ochrony"
        >
          🔗 Link operatora
        </button>
      )}
      {!isClient && (
        <button
          onClick={handleDelete}
          disabled={deleteEvent.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
          title={t('events.delete')}
        >
          ✕ {t('events.delete')}
        </button>
      )}
    </>
  ) : null

  return (
    <AppShell
      nav={nav}
      back={{ to: '/events', label: t('events.title') }}
      title={
        event
          ? prettifyEventName(event.name).isAuto
            ? t('dashboard.untitled')
            : prettifyEventName(event.name).display
          : t('common.loading')
      }
      subtitle={event ? `/${event.slug}` : undefined}
      actions={actions}
    >
      {isLoading || !event ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (
        <>
          {activeTab === 'overview' && <OverviewTab eventId={eventId} />}
          {activeTab === 'participants' && <ParticipantsTab eventId={eventId} />}
          {activeTab === 'agenda' && <AgendaTab eventId={eventId} />}
          {activeTab === 'page' && <PageBuilderTab eventId={eventId} />}
          {activeTab === 'logistics' && <LogisticsTab eventId={eventId} />}
          {activeTab === 'engagement' && <EngagementTab eventId={eventId} />}
          {activeTab === 'gallery' && <GalleryTab eventId={eventId} />}
          {activeTab === 'dashboard' && <DashboardTab eventId={eventId} />}
          {activeTab === 'audit' && <AuditTab />}
        </>
      )}
    </AppShell>
  )
}
