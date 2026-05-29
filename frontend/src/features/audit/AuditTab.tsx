import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { Card } from '../../components/ui'

interface AuditEntry {
  id: string
  userId: string | null
  principalType: string | null
  action: string
  createdAt: string
  payload: string | null
}

function useAudit() {
  return useQuery({
    queryKey: ['audit'],
    queryFn: async () => (await api.get<AuditEntry[]>('/api/audit?take=100')).data,
  })
}

export function AuditTab() {
  const { t } = useTranslation()
  const { data, isLoading } = useAudit()

  if (isLoading) return <p className="text-slate-500">{t('common.loading')}</p>

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-500">
          <tr>
            <th className="px-4 py-2">{t('audit.when')}</th>
            <th className="px-4 py-2">{t('audit.who')}</th>
            <th className="px-4 py-2">{t('audit.action')}</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((entry) => (
            <tr key={entry.id} className="border-b border-slate-100">
              <td className="px-4 py-2 text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
              <td className="px-4 py-2">{entry.principalType ?? '—'}</td>
              <td className="px-4 py-2 font-mono text-xs">{entry.action}</td>
            </tr>
          ))}
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                {t('audit.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  )
}
