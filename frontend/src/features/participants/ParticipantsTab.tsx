import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  downloadTemplate,
  exportParticipants,
  openParticipantQr,
  useAddParticipant,
  useDeleteParticipant,
  useImportParticipants,
  useParticipants,
  useSendClientLinks,
  useSendInvitations,
} from './api'
import { useCustomFields } from '../events/api'
import { Button, Card, Field, Input } from '../../components/ui'
import { FileButton } from '../../components/FileButton'
import { Icon } from '../../components/Icon'
import { useAuthStore } from '../../stores/authStore'
import {
  CustomFieldType,
  ParticipantStatusName,
  type CustomFieldDto,
  type ImportResult,
  type ParticipantDto,
} from '../../types/api'

/** Parses a MultiSelect answer ("[\"A\",\"B\"]") back into its option labels; anything else → []. */
function parseMultiSelectAnswer(raw: string | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Renders a stored custom-field answer as display text, per field type. Null = no answer given. */
function formatCustomFieldAnswer(field: CustomFieldDto, raw: string | undefined, yesLabel: string, noLabel: string): string | null {
  if (raw === undefined || raw === '') return null
  if (field.type === CustomFieldType.Checkbox) return raw === 'true' ? yesLabel : noLabel
  if (field.type === CustomFieldType.MultiSelect) {
    const list = parseMultiSelectAnswer(raw)
    return list.length > 0 ? list.join(', ') : null
  }
  return raw
}

type View = { kind: 'empty' } | { kind: 'new' } | { kind: 'detail'; participant: ParticipantDto }
type StatusFilter = 'all' | 'invited' | 'confirmed' | 'checkedIn' | 'noShow'

function statusMeta(status: number): { label: string; chip: string; dot: string } {
  switch (status) {
    case 0:
      return { label: 'Invited', chip: 'bg-amber-400/15 text-amber-300 ring-amber-400/30', dot: 'bg-amber-400' }
    case 1:
      return { label: 'Activated', chip: 'bg-sky-400/15 text-sky-300 ring-sky-400/30', dot: 'bg-sky-400' }
    case 2:
      return { label: 'Confirmed', chip: 'bg-indigo-400/15 text-indigo-300 ring-indigo-400/30', dot: 'bg-indigo-400' }
    case 3:
      return { label: 'Declined', chip: 'bg-rose-400/15 text-rose-300 ring-rose-400/30', dot: 'bg-rose-400' }
    case 4:
      return { label: 'Checked-in', chip: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30', dot: 'bg-emerald-400' }
    case 5:
      return { label: 'Checked-out', chip: 'bg-violet-400/15 text-violet-300 ring-violet-400/30', dot: 'bg-violet-400' }
    case 6:
      return { label: 'No-show', chip: 'bg-slate-400/10 text-slate-300 ring-slate-400/20', dot: 'bg-slate-400' }
    default:
      return { label: '—', chip: 'bg-slate-400/10 text-slate-300 ring-slate-400/20', dot: 'bg-slate-400' }
  }
}

function initials(p: ParticipantDto): string {
  return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase()
}
function avatarGradient(seed: string): string {
  // Stable hash-ish picker.
  const variants = [
    'from-indigo-500 to-violet-500',
    'from-violet-500 to-fuchsia-500',
    'from-sky-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-pink-500 to-rose-500',
  ]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return variants[h % variants.length]
}

export function ParticipantsTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: participants, isLoading } = useParticipants(eventId)
  const inviteMut = useSendInvitations(eventId)
  const clientLinksMut = useSendClientLinks(eventId)
  const isAgency = useAuthStore((s) => s.principalType) === 'Agency'
  const [view, setView] = useState<View>({ kind: 'empty' })
  const [showImport, setShowImport] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StatusFilter>('all')

  // Accompanying persons are shown nested under their host, not as top-level rows.
  const companionsByParent = useMemo(() => {
    const map = new Map<string, ParticipantDto[]>()
    for (const p of participants ?? []) {
      if (p.parentParticipantId) {
        const arr = map.get(p.parentParticipantId) ?? []
        arr.push(p)
        map.set(p.parentParticipantId, arr)
      }
    }
    return map
  }, [participants])

  const filtered = useMemo(() => {
    const list = participants ?? []
    const q = query.trim().toLowerCase()
    return list.filter((p) => {
      if (p.parentParticipantId) return false // companions are nested, not listed top-level
      const matchStatus =
        filter === 'all' ||
        (filter === 'invited' && p.status === 0) ||
        (filter === 'confirmed' && p.status === 2) ||
        (filter === 'checkedIn' && (p.status === 4 || p.status === 5)) ||
        (filter === 'noShow' && p.status === 6)
      if (!matchStatus) return false
      if (!q) return true
      return (
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        (p.company ?? '').toLowerCase().includes(q)
      )
    })
  }, [participants, query, filter])

  // Stat counts.
  const stats = useMemo(() => {
    const list = participants ?? []
    return {
      total: list.length,
      invited: list.filter((p) => p.status === 0).length,
      confirmed: list.filter((p) => p.status === 2).length,
      checkedIn: list.filter((p) => p.status === 4 || p.status === 5).length,
      noShow: list.filter((p) => p.status === 6).length,
    }
  }, [participants])

  return (
    <div className="space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-1.5">
          <Icon name="users" className="h-3.5 w-3.5 text-indigo-200" />
          <span className="text-sm font-semibold text-white">{t('participants.title')}</span>
          <span className="rounded-full bg-slate-800/80 px-1.5 text-[10px] text-slate-400">{stats.total}</span>
        </div>
        <Button variant="ghost" onClick={() => setShowImport((v) => !v)}>
          <Icon name="document" className="h-3.5 w-3.5" />
          {showImport ? t('participants.importCollapse') : t('participants.importExpand')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            if (window.confirm(t('participants.confirmInvite'))) inviteMut.mutate()
          }}
          disabled={inviteMut.isPending}
        >
          <Icon name="sparkles" className="h-3.5 w-3.5" />
          {t('participants.invite')}
        </Button>
        {isAgency && (
          <Button
            variant="ghost"
            onClick={() => {
              if (window.confirm(t('participants.confirmClientLinks'))) clientLinksMut.mutate()
            }}
            disabled={clientLinksMut.isPending || stats.total === 0}
          >
            📧 {t('participants.clientLinks')}
          </Button>
        )}
        <Button variant="ghost" onClick={() => void exportParticipants(eventId)} disabled={stats.total === 0}>
          <Icon name="document" className="h-3.5 w-3.5" />
          {t('participants.export')}
        </Button>
        <Button className="ml-auto" onClick={() => setView({ kind: 'new' })}>
          <Icon name="plus" className="h-4 w-4" />
          {t('participants.newParticipant')}
        </Button>
      </div>

      {/* IMPORT (collapsible) */}
      {showImport && <ImportPanel eventId={eventId} />}

      {inviteMut.data && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          ✓ {t('participants.invited', { count: inviteMut.data.sentCount })}
        </p>
      )}
      {clientLinksMut.data && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          ✓ {t('participants.clientLinksSent', { count: clientLinksMut.data.linkCount })}
        </p>
      )}
      {clientLinksMut.isError && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {t('participants.clientLinksError')}
        </p>
      )}

      {/* Universal self-service login link — guests enter their e-mail and get their token link. */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800/70 bg-slate-950/40 px-3 py-2 text-xs">
        <span className="shrink-0 text-slate-400">🔗 {t('participants.universalLink')}:</span>
        <input
          readOnly
          value={`${window.location.origin}/e/${eventId}/login`}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-[180px] flex-1 rounded bg-transparent font-mono text-slate-300 outline-none"
        />
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/e/${eventId}/login`)}
          className="shrink-0 rounded border border-slate-700/60 bg-slate-800/60 px-2 py-1 text-slate-200 hover:bg-slate-800"
        >
          {t('participants.copy')}
        </button>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('participants.search')}
            className="w-full rounded-xl border border-slate-800/80 bg-slate-950/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-800/80 bg-slate-950/40 p-1">
          {(['all', 'invited', 'confirmed', 'checkedIn', 'noShow'] as StatusFilter[]).map((f) => {
            const labels: Record<StatusFilter, string> = {
              all: `${t('participants.all')} ${stats.total}`,
              invited: `Invited ${stats.invited}`,
              confirmed: `Confirmed ${stats.confirmed}`,
              checkedIn: `Checked-in ${stats.checkedIn}`,
              noShow: `No-show ${stats.noShow}`,
            }
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filter === f
                    ? 'bg-gradient-to-r from-indigo-500/30 to-violet-500/30 text-white ring-1 ring-inset ring-indigo-400/40'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {labels[f]}
              </button>
            )
          })}
        </div>
      </div>

      {/* MAIN 2-COL */}
      {(participants ?? []).length === 0 && view.kind === 'empty' && !isLoading ? (
        <EmptyAll onNew={() => setView({ kind: 'new' })} onImport={() => setShowImport(true)} />
      ) : (participants ?? []).length === 0 && view.kind === 'new' ? (
        <div className="mx-auto w-full max-w-3xl">
          <NewParticipantForm
            eventId={eventId}
            onDone={() => setView({ kind: 'empty' })}
            onCancel={() => setView({ kind: 'empty' })}
          />
        </div>
      ) : (
      <div className="grid items-start gap-4 lg:grid-cols-[420px_1fr]">
        {/* LEFT: list */}
        <div className="space-y-1.5">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg border border-slate-800/70 bg-slate-900/40" />
            ))
          ) : filtered.length === 0 ? (
            (participants ?? []).length === 0 ? (
              <EmptyList onNew={() => setView({ kind: 'new' })} onImport={() => setShowImport(true)} />
            ) : (
              <Card className="py-8 text-center text-sm text-slate-400">—</Card>
            )
          ) : (
            filtered.map((p) => {
              const companions = companionsByParent.get(p.id) ?? []
              return (
                <div key={p.id}>
                  <ParticipantRow
                    participant={p}
                    active={view.kind === 'detail' && view.participant.id === p.id}
                    onClick={() => setView({ kind: 'detail', participant: p })}
                  />
                  {companions.length > 0 && (
                    <ul className="ml-5 mt-1 space-y-1 border-l border-slate-800/70 pl-3">
                      {companions.map((c) => (
                        <li key={c.id} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="text-slate-600">↳</span>
                          <span className="text-slate-200">
                            {c.firstName} {c.lastName}
                          </span>
                          {c.age != null && (
                            <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px]">
                              {t('participants.ageYears', { n: c.age })}
                            </span>
                          )}
                          {c.status >= 4 && c.status <= 5 && (
                            <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">✓</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* RIGHT: detail */}
        <div>
          {view.kind === 'empty' && <EmptyDetail />}
          {view.kind === 'new' && (
            <NewParticipantForm
              eventId={eventId}
              onDone={() => setView({ kind: 'empty' })}
              onCancel={() => setView({ kind: 'empty' })}
            />
          )}
          {view.kind === 'detail' && (
            <ParticipantDetail
              key={view.participant.id}
              eventId={eventId}
              participant={view.participant}
              onDeleted={() => setView({ kind: 'empty' })}
            />
          )}
        </div>
      </div>
      )}
    </div>
  )
}

// Single full-width empty state when no participants exist yet.
function EmptyAll({ onNew, onImport }: { onNew: () => void; onImport: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-[-4rem] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative flex flex-col items-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
          <Icon name="users" className="h-7 w-7 text-indigo-200" />
        </div>
        <p className="mt-4 text-base font-semibold text-white">{t('participants.empty')}</p>
        <p className="mt-1 max-w-md text-sm text-slate-400">{t('participants.emptyHint')}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="ghost" onClick={onImport}>
            <Icon name="document" className="h-3.5 w-3.5" />
            {t('participants.import')}
          </Button>
          <Button onClick={onNew}>
            <Icon name="plus" className="h-3.5 w-3.5" />
            {t('participants.newParticipant')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ============ ParticipantRow ============
function ParticipantRow({
  participant,
  active,
  onClick,
}: {
  participant: ParticipantDto
  active: boolean
  onClick: () => void
}) {
  const status = statusMeta(participant.status)
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
        active
          ? 'border-indigo-400/40 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/40'
          : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30 hover:bg-slate-900'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(participant.email ?? participant.id)} text-xs font-bold text-white`}
      >
        {initials(participant)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {participant.firstName} {participant.lastName}
        </p>
        <p className="truncate text-[11px] text-slate-400">{participant.email}</p>
      </div>
      <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${status.chip}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
        {status.label}
      </span>
    </button>
  )
}

// ============ Empty states ============
function EmptyList({ onNew, onImport }: { onNew: () => void; onImport: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col items-center py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
        <Icon name="users" className="h-5 w-5 text-indigo-200" />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{t('participants.empty')}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{t('participants.emptyHint')}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" onClick={onImport}>
          <Icon name="document" className="h-3.5 w-3.5" />
          {t('participants.import')}
        </Button>
        <Button onClick={onNew}>
          <Icon name="plus" className="h-3.5 w-3.5" />
          {t('participants.newParticipant')}
        </Button>
      </div>
    </Card>
  )
}

function EmptyDetail() {
  const { t } = useTranslation()
  return (
    <Card className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/30">
        <Icon name="users" className="h-6 w-6 text-indigo-200" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{t('participants.select')}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{t('participants.selectHint')}</p>
    </Card>
  )
}

// ============ Import Panel ============
function ImportPanel({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const importMut = useImportParticipants(eventId)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function runImport(commit: boolean) {
    if (!file) return
    const res = await importMut.mutateAsync({ file, commit })
    setResult(res)
    if (commit) setFile(null)
  }

  return (
    <Card>
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
          <Icon name="document" className="h-4 w-4" />
        </span>
        <h3 className="font-semibold text-white">{t('participants.import')}</h3>
        <Button variant="ghost" className="ml-auto" onClick={() => downloadTemplate(eventId)}>
          <Icon name="document" className="h-3.5 w-3.5" />
          {t('participants.template')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FileButton
          accept=".xlsx"
          onSelect={(files) => setFile(files[0] ?? null)}
          icon="document"
          variant={file ? 'subtle' : 'primary'}
          showFileName
        >
          {file ? t('participants.changeFile') : t('participants.chooseFile')}
        </FileButton>
        <Button variant="ghost" disabled={!file || importMut.isPending} onClick={() => runImport(false)}>
          {t('participants.preview')}
        </Button>
        <Button disabled={!file || importMut.isPending} onClick={() => runImport(true)}>
          <Icon name="check" className="h-3.5 w-3.5" />
          {t('participants.doImport')}
        </Button>
      </div>
      {result && (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm">
          <div className="flex flex-wrap gap-3 text-xs">
            <Stat label={t('participants.rows')} value={result.totalRows} />
            <Stat label={t('participants.valid')} value={result.validRows} accent="emerald" />
            <Stat label={t('participants.importedCount')} value={result.importedCount} accent="indigo" />
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-rose-300">
              {result.errors.map((er, i) => (
                <li key={i}>
                  <span className="font-mono text-rose-400">{t('participants.row')} {er.rowNumber}</span> · {er.message}
                </li>
              ))}
            </ul>
          )}
          {result.duplicateEmails.length > 0 && (
            <p className="mt-2 text-xs text-amber-300">
              {t('participants.duplicates')}: {result.duplicateEmails.join(', ')}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

function Stat({ label, value, accent = 'slate' }: { label: string; value: number; accent?: 'slate' | 'emerald' | 'indigo' }) {
  const colors = {
    slate: 'text-slate-300',
    emerald: 'text-emerald-300',
    indigo: 'text-indigo-300',
  }[accent]
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${colors}`}>{value}</p>
    </div>
  )
}

// ============ New participant ============
function NewParticipantForm({
  eventId,
  onDone,
  onCancel,
}: {
  eventId: string
  onDone: () => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const add = useAddParticipant(eventId)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
          <Icon name="plus" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-white">{t('participants.newParticipant')}</h3>
          <p className="text-xs text-slate-400">{t('participants.emptyHint')}</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await add.mutateAsync({ firstName, lastName, email })
          onDone()
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('participants.firstName')}>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
          </Field>
          <Field label={t('participants.lastName')}>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
        </div>
        <Field label={t('auth.email')}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <div className="flex gap-2 border-t border-slate-800/80 pt-3">
          <Button type="submit" disabled={add.isPending}>
            <Icon name="check" className="h-3.5 w-3.5" />
            {t('common.create')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ============ Participant detail ============
function ParticipantDetail({
  eventId,
  participant,
  onDeleted,
}: {
  eventId: string
  participant: ParticipantDto
  onDeleted: () => void
}) {
  const { t, i18n } = useTranslation()
  const en = i18n.resolvedLanguage === 'en'
  const status = statusMeta(participant.status)
  const del = useDeleteParticipant(eventId)
  const { data: customFieldDefs } = useCustomFields(eventId)

  async function remove() {
    if (!window.confirm(t('participants.deleteConfirm', { name: `${participant.firstName} ${participant.lastName}` }))) return
    await del.mutateAsync(participant.id)
    onDeleted()
  }
  return (
    <Card>
      {/* Header */}
      <div className="mb-4 flex items-start gap-3">
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${avatarGradient(participant.email ?? participant.id)} text-lg font-bold text-white shadow-lg`}
        >
          {initials(participant)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-white">
            {participant.firstName} {participant.lastName}
          </h2>
          <p className="truncate text-sm text-slate-400">{participant.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${status.chip}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <span className="rounded-full bg-slate-800/60 px-2 py-0.5 text-[10px] font-mono text-slate-300">
              {ParticipantStatusName[participant.status]}
            </span>
          </div>
        </div>
        <button
          onClick={() => openParticipantQr(eventId, participant.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-indigo-400/40 hover:bg-slate-800 hover:text-white"
          title={t('participants.qrCode')}
        >
          <Icon name="qr" className="h-3.5 w-3.5" />
          QR
        </button>
      </div>

      {/* Personal login link — for primary guests with an e-mail (clients can copy/share it). */}
      {participant.email && !participant.parentParticipantId && (
        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
            {t('participants.loginLink')}
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={`${window.location.origin}/p/${participant.accessToken}`}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full truncate rounded-md border border-slate-700/70 bg-slate-900/60 px-2 py-1.5 text-xs text-slate-300 outline-none"
            />
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(`${window.location.origin}/p/${participant.accessToken}`)}
              className="shrink-0 rounded-md border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              {t('participants.copy')}
            </button>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        <Section title={t('participants.info')}>
          {participant.phone && <DetailItem icon="users" label={t('participants.phone')}>{participant.phone}</DetailItem>}
          {participant.company && <DetailItem icon="document" label={t('participants.company')}>{participant.company}</DetailItem>}
          {participant.position && <DetailItem icon="sparkles" label={t('participants.position')}>{participant.position}</DetailItem>}
          <DetailItem icon="document" label={t('participants.language')}>{participant.language.toUpperCase()}</DetailItem>
        </Section>

        {/* Consents — always shown so the organiser can see exactly what the guest agreed to. */}
        <Section title={t('participants.consents')}>
          <ConsentBadge label={t('participants.rodo')} accepted={participant.hasAcceptedRodo} required />
          <ConsentBadge label={t('participants.photoConsent')} accepted={participant.photoConsent} />
          <ConsentBadge label={t('participants.networkingConsent')} accepted={participant.networkingConsent} />
        </Section>

        {(participant.dietaryPreferences || participant.shirtSize || participant.wishes) && (
          <Section title={t('participants.preferences')}>
            {participant.dietaryPreferences && (
              <DetailItem icon="document" label={t('participants.diet')}>{participant.dietaryPreferences}</DetailItem>
            )}
            {participant.shirtSize && (
              <DetailItem icon="document" label={t('participants.shirtSize')}>{participant.shirtSize}</DetailItem>
            )}
            {participant.wishes && (
              <DetailItem icon="sparkles" label={t('participants.wishes')}>{participant.wishes}</DetailItem>
            )}
          </Section>
        )}

        {/* Custom-field ("Formularz") answers — every field defined for this event, with the guest's answer. */}
        {customFieldDefs && customFieldDefs.length > 0 && (
          <Section title={t('participants.formAnswers')}>
            {customFieldDefs.map((f) => {
              const label = (en && f.labelEn) || f.labelPl
              const answer = formatCustomFieldAnswer(f, participant.customFields[f.id], t('common.yes'), t('common.no'))
              return (
                <DetailItem key={f.id} icon="document" label={label}>
                  {answer ?? <span className="italic text-slate-500">{t('participants.noAnswer')}</span>}
                </DetailItem>
              )
            })}
          </Section>
        )}

        {(participant.tableName || participant.roomNumber || participant.groupName || participant.airportTransfer) && (
          <Section title={t('participants.logistics')}>
            {participant.tableName && <DetailItem icon="document" label={t('participants.table')}>{participant.tableName}</DetailItem>}
            {participant.roomNumber && <DetailItem icon="document" label={t('participants.room')}>{participant.roomNumber}</DetailItem>}
            {participant.groupName && <DetailItem icon="users" label={t('participants.group')}>{participant.groupName}</DetailItem>}
            {participant.airportTransfer && (
              <DetailItem icon="truck" label={t('participants.transfer')}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  <Icon name="check" className="h-3 w-3" /> Tak
                </span>
              </DetailItem>
            )}
          </Section>
        )}
      </div>

      {/* Danger zone — remove this guest (and their plus-ones) from the event. */}
      <div className="mt-5 border-t border-slate-800/70 pt-4">
        <button
          type="button"
          onClick={() => void remove()}
          disabled={del.isPending}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-300 transition hover:border-rose-400/50 hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-50"
        >
          ✕ {del.isPending ? '…' : t('participants.delete')}
        </button>
        <p className="mt-1.5 text-[11px] text-slate-500">{t('participants.deleteHint')}</p>
      </div>
    </Card>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        <span className="h-1 w-4 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DetailItem({
  icon,
  label,
  children,
}: {
  icon: 'users' | 'document' | 'sparkles' | 'truck'
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900/80 ring-1 ring-inset ring-slate-700/60 text-slate-300">
        <Icon name={icon} className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <p className="truncate text-sm text-white">{children}</p>
      </div>
    </div>
  )
}

/** A yes/no consent row (RODO / photo / networking) — green check when accepted, red/dim otherwise. */
function ConsentBadge({ label, accepted, required }: { label: string; accepted: boolean; required?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5">
      <span className="text-sm text-slate-200">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          accepted ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-700/40 text-slate-400'
        }`}
      >
        {accepted ? <Icon name="check" className="h-3 w-3" /> : <span className="text-xs leading-none">✕</span>}
        {accepted ? 'Tak' : 'Nie'}
      </span>
    </div>
  )
}
