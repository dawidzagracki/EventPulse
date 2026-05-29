import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { createEventConnection } from '../../lib/signalr'
import { Card } from '../../components/ui'
import type { DashboardData } from '../../types/api'

function useDashboard(eventId: string) {
  return useQuery({
    queryKey: ['dashboard', eventId],
    queryFn: async () => (await api.get<DashboardData>(`/api/events/${eventId}/dashboard`)).data,
  })
}

export function DashboardTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data, isLoading } = useDashboard(eventId)

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

  const stats: { label: string; value: string | number; accent?: boolean }[] = [
    { label: t('dashboard.total'), value: data.total },
    { label: t('dashboard.checkedIn'), value: data.checkedIn, accent: true },
    { label: t('dashboard.attendance'), value: `${data.attendancePct}%`, accent: true },
    { label: t('dashboard.confirmed'), value: data.confirmed },
    { label: t('dashboard.checkedOut'), value: data.checkedOut },
    { label: t('dashboard.noShow'), value: data.noShow },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="text-center">
            <p className={`text-3xl font-bold ${s.accent ? 'text-indigo-600' : 'text-slate-800'}`}>{s.value}</p>
            <p className="text-xs uppercase text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">{t('dashboard.recent')}</h3>
        {data.recentCheckIns.length === 0 ? (
          <p className="text-slate-500">{t('dashboard.noCheckIns')}</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.recentCheckIns.map((c, i) => (
              <li key={i} className="flex justify-between">
                <span>{c.name}</span>
                <span className="text-slate-500">{new Date(c.at).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
