import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateTransfer, useDeleteTransfer, useTransfers } from './api'
import { Button, Card, Field, Input } from '../../components/ui'
import { Icon } from '../../components/Icon'
import type { TransferDto } from '../../types/api'

type View =
  | { kind: 'empty' }
  | { kind: 'new' }
  | { kind: 'detail'; transfer: TransferDto }

export function LogisticsTab({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation()
  const { data: transfers, isLoading } = useTransfers(eventId)
  const del = useDeleteTransfer(eventId)
  const [view, setView] = useState<View>({ kind: 'empty' })

  const sorted = (transfers ?? []).slice().sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime())

  return (
    <div className="space-y-4">
      {/* TOP TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-1.5">
          <Icon name="truck" className="h-3.5 w-3.5 text-indigo-200" />
          <span className="text-sm font-semibold text-white">{t('logistics.transfers')}</span>
          <span className="rounded-full bg-slate-800/80 px-1.5 text-[10px] text-slate-400">
            {transfers?.length ?? 0}
          </span>
        </div>
        <Button className="ml-auto" onClick={() => setView({ kind: 'new' })}>
          <Icon name="plus" className="h-4 w-4" />
          {t('logistics.newTransfer')}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* LEFT */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg border border-slate-800/70 bg-slate-900/40" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <EmptyList onNew={() => setView({ kind: 'new' })} />
          ) : (
            <>
              {sorted.map((tr) => (
                <TransferItem
                  key={tr.id}
                  transfer={tr}
                  active={view.kind === 'detail' && view.transfer.id === tr.id}
                  onClick={() => setView({ kind: 'detail', transfer: tr })}
                  lang={i18n.language}
                />
              ))}
              <button
                onClick={() => setView({ kind: 'new' })}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700/60 px-3 py-2.5 text-sm text-slate-400 transition hover:border-indigo-400/60 hover:bg-indigo-500/5 hover:text-white"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                {t('logistics.newTransfer')}
              </button>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div>
          {view.kind === 'empty' && <EmptyDetail />}
          {view.kind === 'new' && (
            <NewTransferForm
              eventId={eventId}
              onDone={(tr) => setView({ kind: 'detail', transfer: tr })}
              onCancel={() => setView({ kind: 'empty' })}
            />
          )}
          {view.kind === 'detail' && (
            <TransferDetail
              key={view.transfer.id}
              transfer={view.transfer}
              onDelete={async () => {
                await del.mutateAsync(view.transfer.id)
                setView({ kind: 'empty' })
              }}
              deleting={del.isPending}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function TransferItem({
  transfer,
  active,
  onClick,
  lang,
}: {
  transfer: TransferDto
  active: boolean
  onClick: () => void
  lang: string
}) {
  const dt = new Date(transfer.departureTime)
  const day = dt.getDate().toString().padStart(2, '0')
  const month = dt.toLocaleDateString(lang, { month: 'short' }).replace('.', '').toUpperCase()
  const time = dt.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
        active
          ? 'border-indigo-400/40 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/40'
          : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30 hover:bg-slate-900'
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-700/60 bg-slate-950/70 shadow-inner">
        <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">{month}</span>
        <span className="text-base font-bold leading-none text-white">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{transfer.name}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-slate-400">
          <Icon name="clock" className="h-3 w-3" />
          {time} · {transfer.meetingPoint}
        </p>
      </div>
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-500 transition group-hover:text-indigo-300" fill="currentColor" aria-hidden>
        <path d="M9 6l6 6-6 6V6z" />
      </svg>
    </button>
  )
}

function EmptyList({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col items-center py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
        <Icon name="truck" className="h-5 w-5 text-indigo-200" />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{t('logistics.empty')}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{t('logistics.emptyHint')}</p>
      <Button className="mt-4" onClick={onNew}>
        <Icon name="plus" className="h-3.5 w-3.5" />
        {t('logistics.newTransfer')}
      </Button>
    </Card>
  )
}

function EmptyDetail() {
  const { t } = useTranslation()
  return (
    <Card className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/30">
        <Icon name="truck" className="h-6 w-6 text-indigo-200" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{t('logistics.selectTransfer')}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{t('logistics.emptyHint')}</p>
    </Card>
  )
}

function NewTransferForm({
  eventId,
  onDone,
  onCancel,
}: {
  eventId: string
  onDone: (tr: TransferDto) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const create = useCreateTransfer(eventId)
  const [name, setName] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [note, setNote] = useState('')

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
          <Icon name="truck" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-white">{t('logistics.newTransfer')}</h3>
          <p className="text-xs text-slate-400">{t('logistics.emptyHint')}</p>
        </div>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const tr = await create.mutateAsync({
            name,
            departureTime: new Date(departureTime).toISOString(),
            meetingPoint,
            note: note || null,
          })
          onDone(tr)
        }}
        className="space-y-3"
      >
        <Field label={t('logistics.transferName')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder={t('logistics.namePlaceholder')} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('logistics.departure')}>
            <Input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
          </Field>
          <Field label={t('logistics.meetingPoint')}>
            <Input value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} required placeholder={t('logistics.meetingPlaceholder')} />
          </Field>
        </div>
        <Field label={t('logistics.note')}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('logistics.notePlaceholder')} />
        </Field>
        <div className="flex gap-2 border-t border-slate-800/80 pt-3">
          <Button type="submit" disabled={create.isPending}>
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

function TransferDetail({
  transfer,
  onDelete,
  deleting,
}: {
  transfer: TransferDto
  onDelete: () => Promise<void>
  deleting: boolean
}) {
  const { t, i18n } = useTranslation()
  const dt = new Date(transfer.departureTime)
  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30">
          <Icon name="truck" className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-white">{transfer.name}</h2>
          <p className="text-xs text-slate-400">
            {dt.toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <DetailRow icon="clock" label={t('logistics.departure')}>
          {dt.toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'short' })}
        </DetailRow>
        <DetailRow icon="mapPin" label={t('logistics.meetingPoint')}>
          {transfer.meetingPoint}
        </DetailRow>
        {transfer.note && (
          <DetailRow icon="document" label={t('logistics.note')}>
            {transfer.note}
          </DetailRow>
        )}
      </div>

      <div className="mt-4 border-t border-slate-800/80 pt-3">
        <button
          onClick={onDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
        >
          ✕ {t('agenda.delete')}
        </button>
      </div>
    </Card>
  )
}

function DetailRow({ icon, label, children }: { icon: 'clock' | 'mapPin' | 'document'; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900/80 ring-1 ring-inset ring-slate-700/60 text-slate-300">
        <Icon name={icon} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
        <p className="mt-0.5 text-sm text-white">{children}</p>
      </div>
    </div>
  )
}
