import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { createEventConnection } from '../../lib/signalr'
import { Badge, Button, Card, ProgressBar, Stat } from '../../components/ui'
import { Icon } from '../../components/Icon'
import type { DashboardData } from '../../types/api'

interface FeedbackSummary {
  count: number
  average: number
  items: { rating: number; comment: string | null }[]
}

const STATION_GRADIENTS = [
  'from-violet-500 to-fuchsia-500',
  'from-indigo-500 to-sky-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-cyan-500 to-blue-500',
]

function useDashboard(eventId: string) {
  return useQuery({
    queryKey: ['dashboard', eventId],
    queryFn: async () => (await api.get<DashboardData>(`/api/events/${eventId}/dashboard`)).data,
  })
}

function useFeedback(eventId: string) {
  return useQuery({
    queryKey: ['feedback', eventId],
    queryFn: async () => (await api.get<FeedbackSummary>(`/api/events/${eventId}/feedback`)).data,
  })
}

async function downloadReport(eventId: string) {
  const res = await api.get(`/api/events/${eventId}/report`, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `raport-${eventId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export function DashboardTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useDashboard(eventId)
  const { data: feedback } = useFeedback(eventId)

  useEffect(() => {
    const connection = createEventConnection()
    let active = true

    connection.on('dashboardChanged', (payload: DashboardData) => {
      qc.setQueryData(['dashboard', eventId], payload)
    })

    connection
      .start()
      .then(() => {
        if (active) return connection.invoke('JoinEvent', eventId)
      })
      .catch(() => {
        // live updates unavailable; initial fetch still shows data
      })

    return () => {
      active = false
      void connection.stop()
    }
  }, [eventId, qc])

  if (isLoading || !data) {
    return <p className="text-slate-500">{t('common.loading')}</p>
  }

  const maxStation = data.stations.reduce((m, s) => Math.max(m, s.count), 0)
  const attendanceTarget = 75
  const aboveTarget = data.attendancePct >= attendanceTarget

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge tone="success">● {t('dashboard.live')}</Badge>
        <Button variant="subtle" onClick={() => downloadReport(eventId)}>
          {t('dashboard.report')}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t('dashboard.checkedIn')}
          value={data.checkedIn}
          hint={t('dashboard.outOf', { total: data.total })}
          icon={<Icon name="users" className="h-5 w-5 text-violet-300" />}
          accent="violet"
        />
        <Stat
          label={t('dashboard.attendance')}
          value={`${data.attendancePct}%`}
          hint={t('dashboard.target', { value: attendanceTarget })}
          badge={aboveTarget ? { text: `≥ ${attendanceTarget}%`, tone: 'success' } : undefined}
          icon={<Icon name="bolt" className="h-5 w-5 text-indigo-300" />}
          accent="indigo"
        />
        <Stat
          label={t('dashboard.total')}
          value={data.total}
          icon={<Icon name="calendar" className="h-5 w-5 text-sky-300" />}
          accent="sky"
        />
        <Stat
          label={t('dashboard.noShow')}
          value={data.noShow}
          icon={<Icon name="shield" className="h-5 w-5 text-amber-300" />}
          accent="amber"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">{t('dashboard.stations')}</h3>
            <Badge tone="info">{data.stations.length}</Badge>
          </div>
          {data.stations.length === 0 ? (
            <p className="text-sm text-slate-500">{t('dashboard.noStations')}</p>
          ) : (
            <ul className="space-y-3">
              {data.stations.map((s, i) => (
                <li key={s.code}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-slate-300">{s.code}</span>
                    <span className="text-slate-400">{s.count} {t('dashboard.scans')}</span>
                  </div>
                  <ProgressBar
                    value={s.count}
                    max={maxStation}
                    gradient={STATION_GRADIENTS[i % STATION_GRADIENTS.length]}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">{t('dashboard.recent')}</h3>
            <Badge tone="accent">{data.recentCheckIns.length}</Badge>
          </div>
          {data.recentCheckIns.length === 0 ? (
            <p className="text-sm text-slate-500">{t('dashboard.noCheckIns')}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.recentCheckIns.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/40 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                      ✓
                    </span>
                    <span className="truncate text-slate-100">{c.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">{new Date(c.at).toLocaleTimeString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {feedback && feedback.count > 0 && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-white">{t('feedback.title')}</h3>
            <span className="text-sm text-slate-400">
              {feedback.average} / 5 · {feedback.count}
            </span>
          </div>
          <ProgressBar
            value={feedback.average}
            max={5}
            gradient="from-amber-400 to-amber-500"
          />
        </Card>
      )}
    </div>
  )
}
