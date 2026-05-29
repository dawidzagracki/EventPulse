import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { createEventConnection } from '../../lib/signalr'
import { Button, Card } from '../../components/ui'
import type { DashboardData } from '../../types/api'

interface FeedbackSummary {
  count: number
  average: number
  items: { rating: number; comment: string | null }[]
}

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {t('feedback.average')}: {feedback ? `${feedback.average} / 5 (${feedback.count})` : '—'}
        </p>
        <Button variant="ghost" onClick={() => downloadReport(eventId)}>
          {t('dashboard.report')}
        </Button>
      </div>

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
