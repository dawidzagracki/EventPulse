import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../../lib/api'
import { Card } from '../../components/ui'
import { Icon, type IconName } from '../../components/Icon'

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
    queryFn: async () => (await api.get<AuditEntry[]>('/api/audit?take=200')).data,
  })
}

// Classify action verbs so we can color-code rows.
function actionMeta(action: string): { tone: 'create' | 'update' | 'delete' | 'auth' | 'other'; icon: IconName; label: string } {
  const a = action.toLowerCase()
  if (a.includes('create') || a.includes('add') || a.includes('import')) return { tone: 'create', icon: 'plus', label: 'Create' }
  if (a.includes('delete') || a.includes('remove')) return { tone: 'delete', icon: 'logout', label: 'Delete' }
  if (a.includes('update') || a.includes('edit') || a.includes('rename') || a.includes('publish')) return { tone: 'update', icon: 'check', label: 'Update' }
  if (a.includes('login') || a.includes('logout') || a.includes('auth') || a.includes('token')) return { tone: 'auth', icon: 'shield', label: 'Auth' }
  return { tone: 'other', icon: 'document', label: 'Other' }
}

const TONE_CLASSES = {
  create: { chip: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30', leftBar: 'bg-emerald-400', icon: 'text-emerald-200' },
  update: { chip: 'bg-sky-400/15 text-sky-300 ring-sky-400/30', leftBar: 'bg-sky-400', icon: 'text-sky-200' },
  delete: { chip: 'bg-rose-400/15 text-rose-300 ring-rose-400/30', leftBar: 'bg-rose-400', icon: 'text-rose-200' },
  auth: { chip: 'bg-violet-400/15 text-violet-300 ring-violet-400/30', leftBar: 'bg-violet-400', icon: 'text-violet-200' },
  other: { chip: 'bg-slate-400/10 text-slate-300 ring-slate-400/20', leftBar: 'bg-slate-500', icon: 'text-slate-300' },
} as const

type Filter = 'all' | 'create' | 'update' | 'delete' | 'auth' | 'other'

const FILTERS: Filter[] = ['all', 'create', 'update', 'delete', 'auth', 'other']

function principalLabel(p: string | null, t: (k: string) => string): string {
  if (!p) return t('audit.principalSystem')
  if (p === 'Agency') return t('audit.principalAgency')
  if (p === 'Client') return t('audit.principalClient')
  if (p === 'Participant') return t('audit.principalParticipant')
  return p
}

function principalAvatarStyle(p: string | null): string {
  if (!p) return 'from-slate-500 to-slate-700'
  if (p === 'Agency') return 'from-violet-500 to-fuchsia-500'
  if (p === 'Client') return 'from-sky-500 to-cyan-500'
  if (p === 'Participant') return 'from-emerald-500 to-teal-500'
  return 'from-slate-500 to-slate-700'
}

export function AuditTab() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useAudit()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const list = data ?? []
    const q = query.trim().toLowerCase()
    return list.filter((e) => {
      const meta = actionMeta(e.action)
      if (filter !== 'all' && meta.tone !== filter) return false
      if (!q) return true
      return e.action.toLowerCase().includes(q) || (e.principalType ?? '').toLowerCase().includes(q)
    })
  }, [data, query, filter])

  // Group by day.
  const grouped = useMemo(() => {
    const groups: Record<string, AuditEntry[]> = {}
    for (const e of filtered) {
      const day = new Date(e.createdAt).toDateString()
      ;(groups[day] = groups[day] ?? []).push(e)
    }
    return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
  }, [filtered])

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg border border-slate-800/70 bg-slate-900/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('audit.search')}
            className="w-full rounded-xl border border-slate-800/80 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800/80 bg-slate-950/40 p-1">
          {FILTERS.map((f) => {
            const label =
              f === 'all'
                ? t('audit.all')
                : f === 'create'
                  ? 'Create'
                  : f === 'update'
                    ? 'Update'
                    : f === 'delete'
                      ? 'Delete'
                      : f === 'auth'
                        ? 'Auth'
                        : 'Other'
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === f
                    ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-white ring-1 ring-inset ring-indigo-400/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Body */}
      {grouped.length === 0 ? (
        <Card className="flex flex-col items-center py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
            <Icon name="shield" className="h-6 w-6 text-indigo-200" />
          </div>
          <p className="mt-4 text-sm font-semibold text-white">{t('audit.empty')}</p>
          <p className="mt-1 max-w-xs text-xs text-slate-400">{t('audit.emptyHint')}</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, entries]) => {
            const date = new Date(day)
            return (
              <section key={day}>
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className="h-1 w-6 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                    {date.toLocaleDateString(i18n.language, { weekday: 'long', day: '2-digit', month: 'long' })}
                  </h2>
                  <span className="rounded-full bg-slate-800/60 px-1.5 py-0.5 text-[10px] text-slate-400">{entries.length}</span>
                </div>
                <ul className="space-y-2">
                  {entries.map((e) => {
                    const meta = actionMeta(e.action)
                    const tc = TONE_CLASSES[meta.tone]
                    const isOpen = expanded === e.id
                    return (
                      <li key={e.id}>
                        <div
                          className={`relative overflow-hidden rounded-lg border border-slate-800/70 bg-slate-900/40 transition hover:border-slate-700 ${isOpen ? 'ring-1 ring-inset ring-indigo-400/30' : ''}`}
                        >
                          <span className={`absolute inset-y-0 left-0 w-1 ${tc.leftBar}`} aria-hidden />
                          <button
                            onClick={() => setExpanded(isOpen ? null : e.id)}
                            className="relative flex w-full items-center gap-3 px-4 py-3 pl-5 text-left transition hover:bg-slate-900/70"
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950/60 ring-1 ring-inset ${tc.icon}`}
                            >
                              <Icon name={meta.icon} className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-2 truncate text-sm">
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${tc.chip}`}>
                                  {meta.label}
                                </span>
                                <code className="truncate font-mono text-xs text-slate-200">{e.action}</code>
                              </p>
                              <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                                <span
                                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br text-[8px] font-bold text-white ${principalAvatarStyle(e.principalType)}`}
                                >
                                  {(e.principalType ?? 'S').charAt(0)}
                                </span>
                                {principalLabel(e.principalType, t)}
                                <span>·</span>
                                {new Date(e.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </p>
                            </div>
                            {e.payload && (
                              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                                {isOpen ? '▾' : '▸'}
                              </span>
                            )}
                          </button>
                          {isOpen && e.payload && (
                            <div className="border-t border-slate-800/80 bg-slate-950/60 p-3">
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                                {t('audit.payload')}
                              </p>
                              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-slate-950 p-2 font-mono text-[11px] text-slate-300">
                                {tryFormatJson(e.payload)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

function tryFormatJson(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    return s
  }
}
