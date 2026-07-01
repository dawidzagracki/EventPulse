import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCreateAgendaItem,
  useUpdateAgendaItem,
  useAgenda,
  useDeleteAgendaItem,
  useAgendaTypes,
  useSaveAgendaTypes,
} from './api'
import { Button, Card, Field, Input } from '../../components/ui'
import { ColorPicker } from '../../components/ColorPicker'
import { EmojiPicker } from '../../components/EmojiPicker'
import { DateTimeInput } from '../../components/DateTimeInput'
import { Icon, type IconName } from '../../components/Icon'
import type { AgendaItemDto, AgendaItemInput, AgendaTypeDto, AgendaTypeInput } from '../../types/api'

type View =
  | { kind: 'empty' }
  | { kind: 'new' }
  | { kind: 'detail'; item: AgendaItemDto }
  | { kind: 'edit'; item: AgendaItemDto }

// ISO (UTC) → `YYYY-MM-DDTHH:mm` in LOCAL time for datetime inputs (mirror of the
// create form's `new Date(local).toISOString()`).
function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Copy the editable fields of an existing item into an input, so an edit that
// only touches the basic fields never wipes description/location/speaker/etc.
function inputFromItem(item: AgendaItemDto): AgendaItemInput {
  return {
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    titlePl: item.titlePl,
    titleEn: item.titleEn,
    descriptionPl: item.descriptionPl,
    descriptionEn: item.descriptionEn,
    type: item.type,
    locationName: item.locationName,
    locationMapUrl: item.locationMapUrl,
    speakerName: item.speakerName,
    speakerPhone: item.speakerPhone,
    speakerPhotoUrl: item.speakerPhotoUrl,
    menu: item.menu,
    requiresCheckIn: item.requiresCheckIn,
    dressCode: item.dressCode,
    groupName: item.groupName,
    customTypeId: item.customTypeId,
  }
}

// Map agenda type ids → visual meta. Backend enum:
// 0 Talk, 1 Meal, 2 Attraction, 3 Transport, 4 Networking, 5 Other
const TYPE_META: Record<
  number,
  { i18nKey: string; emoji: string; icon: IconName; gradient: string; chip: string }
> = {
  0: { i18nKey: 'agenda.typeTalk', emoji: '🎤', icon: 'sparkles', gradient: 'from-indigo-500 to-violet-500', chip: 'bg-indigo-400/15 text-indigo-300 ring-indigo-400/30' },
  1: { i18nKey: 'agenda.typeMeal', emoji: '🍽', icon: 'document', gradient: 'from-amber-500 to-orange-500', chip: 'bg-amber-400/15 text-amber-300 ring-amber-400/30' },
  2: { i18nKey: 'agenda.typeAttraction', emoji: '🎉', icon: 'bolt', gradient: 'from-fuchsia-500 to-pink-500', chip: 'bg-fuchsia-400/15 text-fuchsia-300 ring-fuchsia-400/30' },
  3: { i18nKey: 'agenda.typeTransport', emoji: '🚌', icon: 'truck', gradient: 'from-sky-500 to-cyan-500', chip: 'bg-sky-400/15 text-sky-300 ring-sky-400/30' },
  4: { i18nKey: 'agenda.typeNetworking', emoji: '🤝', icon: 'users', gradient: 'from-emerald-500 to-teal-500', chip: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30' },
  5: { i18nKey: 'agenda.typeOther', emoji: '✨', icon: 'document', gradient: 'from-slate-500 to-slate-700', chip: 'bg-slate-400/10 text-slate-300 ring-slate-400/20' },
}

export function AgendaTab({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation()
  const { data: items, isLoading } = useAgenda(eventId)
  const { data: customTypes } = useAgendaTypes(eventId)
  const deleteMut = useDeleteAgendaItem(eventId)
  const [view, setView] = useState<View>({ kind: 'empty' })
  const [typesOpen, setTypesOpen] = useState(false)

  // Group items by day and sort chronologically.
  const grouped = useMemo(() => {
    const list = (items ?? []).slice().sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    const groups: Record<string, AgendaItemDto[]> = {}
    for (const it of list) {
      const day = new Date(it.startsAt).toDateString()
      ;(groups[day] = groups[day] ?? []).push(it)
    }
    return Object.entries(groups)
  }, [items])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-1.5">
          <Icon name="calendar" className="h-3.5 w-3.5 text-indigo-200" />
          <span className="text-sm font-semibold text-white">{t('agenda.title')}</span>
          <span className="rounded-full bg-slate-800/80 px-1.5 text-[10px] text-slate-400">{items?.length ?? 0}</span>
        </div>
        <Button variant="subtle" className="ml-auto" onClick={() => setTypesOpen((v) => !v)}>
          🏷 {t('agenda.manageTypes')}
        </Button>
        <Button onClick={() => setView({ kind: 'new' })}>
          <Icon name="plus" className="h-4 w-4" />
          {t('agenda.new')}
        </Button>
      </div>

      {typesOpen && <AgendaTypesManager eventId={eventId} onClose={() => setTypesOpen(false)} />}

      {grouped.length === 0 && view.kind === 'empty' && !isLoading ? (
        <EmptyAll onNew={() => setView({ kind: 'new' })} />
      ) : grouped.length === 0 && view.kind === 'new' ? (
        <div className="mx-auto w-full max-w-3xl">
          <ItemForm
            eventId={eventId}
            customTypes={customTypes ?? []}
            onDone={(it) => setView({ kind: 'detail', item: it })}
            onCancel={() => setView({ kind: 'empty' })}
          />
        </div>
      ) : (
      <div className="grid items-start gap-4 lg:grid-cols-[380px_1fr]">
        {/* LEFT */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-slate-800/70 bg-slate-900/40" />
            ))
          ) : grouped.length === 0 ? (
            <EmptyList onNew={() => setView({ kind: 'new' })} />
          ) : (
            <>
              {grouped.map(([day, dayItems]) => {
                const d = new Date(day)
                return (
                  <div key={day}>
                    <div className="mb-2 flex items-center gap-2 px-1">
                      <span className="h-1 w-5 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
                      <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                        {d.toLocaleDateString(i18n.language, { weekday: 'short', day: '2-digit', month: 'short' })}
                      </h3>
                      <span className="text-[10px] text-slate-500">· {dayItems.length}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {dayItems.map((it) => (
                        <li key={it.id}>
                          <AgendaListItem
                            item={it}
                            lang={i18n.language}
                            active={
                              (view.kind === 'detail' || view.kind === 'edit') && view.item.id === it.id
                            }
                            onClick={() => setView({ kind: 'detail', item: it })}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
              <button
                onClick={() => setView({ kind: 'new' })}
                className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-700/60 px-3 py-2.5 text-sm text-slate-400 transition hover:border-indigo-400/60 hover:bg-indigo-500/5 hover:text-white"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                {t('agenda.new')}
              </button>
            </>
          )}
        </div>

        {/* RIGHT */}
        <div>
          {view.kind === 'empty' && <EmptyDetail />}
          {view.kind === 'new' && (
            <ItemForm
              eventId={eventId}
              customTypes={customTypes ?? []}
              onDone={(it) => setView({ kind: 'detail', item: it })}
              onCancel={() => setView({ kind: 'empty' })}
            />
          )}
          {view.kind === 'edit' && (
            <ItemForm
              key={view.item.id}
              eventId={eventId}
              customTypes={customTypes ?? []}
              initial={view.item}
              onDone={(it) => setView({ kind: 'detail', item: it })}
              onCancel={() => setView({ kind: 'detail', item: view.item })}
            />
          )}
          {view.kind === 'detail' && (
            <ItemDetail
              key={view.item.id}
              item={view.item}
              onEdit={() => setView({ kind: 'edit', item: view.item })}
              onDelete={async () => {
                if (!window.confirm(t('agenda.confirmDelete'))) return
                await deleteMut.mutateAsync(view.item.id)
                setView({ kind: 'empty' })
              }}
              deleting={deleteMut.isPending}
            />
          )}
        </div>
      </div>
      )}
    </div>
  )
}

function EmptyAll({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-[-4rem] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="relative flex flex-col items-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
          <Icon name="calendar" className="h-7 w-7 text-indigo-200" />
        </div>
        <p className="mt-4 text-base font-semibold text-white">{t('agenda.empty')}</p>
        <p className="mt-1 max-w-md text-sm text-slate-400">{t('agenda.emptyHint')}</p>
        <Button className="mt-5" onClick={onNew}>
          <Icon name="plus" className="h-4 w-4" />
          {t('agenda.new')}
        </Button>
      </div>
    </Card>
  )
}

function AgendaListItem({
  item,
  lang,
  active,
  onClick,
}: {
  item: AgendaItemDto
  lang: string
  active: boolean
  onClick: () => void
}) {
  const meta = TYPE_META[item.type] ?? TYPE_META[5]
  const custom = item.customTypeName ? { color: item.customTypeColor ?? '#6366f1', icon: item.customTypeIcon || '🏷' } : null
  const startTime = new Date(item.startsAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  const endTime = new Date(item.endsAt).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' })
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
        active
          ? 'border-indigo-400/40 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/40'
          : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30 hover:bg-slate-900'
      }`}
    >
      <div className="flex w-14 shrink-0 flex-col items-center text-center">
        <span className="text-xs font-bold text-white">{startTime}</span>
        <span className="text-[10px] text-slate-500">{endTime}</span>
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base shadow-md ${custom ? '' : `bg-gradient-to-br ${meta.gradient}`}`}
        style={custom ? { backgroundColor: custom.color } : undefined}
      >
        {custom ? custom.icon : meta.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{item.titlePl}</p>
        <p className="flex items-center gap-2 truncate text-[11px] text-slate-400">
          {item.requiresCheckIn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
              <Icon name="qr" className="h-2.5 w-2.5" /> QR
            </span>
          )}
          {item.locationName && (
            <span className="inline-flex items-center gap-1 truncate">
              <Icon name="mapPin" className="h-2.5 w-2.5" />
              {item.locationName}
            </span>
          )}
        </p>
      </div>
    </button>
  )
}

function EmptyList({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col items-center py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 ring-1 ring-inset ring-indigo-400/40">
        <Icon name="calendar" className="h-5 w-5 text-indigo-200" />
      </div>
      <p className="mt-3 text-sm font-semibold text-white">{t('agenda.empty')}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{t('agenda.emptyHint')}</p>
      <Button className="mt-4" onClick={onNew}>
        <Icon name="plus" className="h-3.5 w-3.5" />
        {t('agenda.new')}
      </Button>
    </Card>
  )
}

function EmptyDetail() {
  const { t } = useTranslation()
  return (
    <Card className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 ring-1 ring-inset ring-indigo-400/30">
        <Icon name="calendar" className="h-6 w-6 text-indigo-200" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">{t('agenda.select')}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-400">{t('agenda.emptyHint')}</p>
    </Card>
  )
}

function ItemForm({
  eventId,
  customTypes,
  initial,
  onDone,
  onCancel,
}: {
  eventId: string
  customTypes: AgendaTypeDto[]
  initial?: AgendaItemDto
  onDone: (it: AgendaItemDto) => void
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const isEdit = !!initial
  const create = useCreateAgendaItem(eventId)
  const update = useUpdateAgendaItem(eventId)
  const [titlePl, setTitlePl] = useState(initial?.titlePl ?? '')
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? '')
  const [startsAt, setStartsAt] = useState(initial ? toLocalInputValue(initial.startsAt) : '')
  const [endsAt, setEndsAt] = useState(initial ? toLocalInputValue(initial.endsAt) : '')
  const [type, setType] = useState(initial?.type ?? 0)
  const [customTypeId, setCustomTypeId] = useState<string | null>(initial?.customTypeId ?? null)
  const [requiresCheckIn, setRequiresCheckIn] = useState(initial?.requiresCheckIn ?? false)
  const saving = create.isPending || update.isPending

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-violet-500/30">
          <Icon name="calendar" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-white">{isEdit ? t('agenda.edit') : t('agenda.new')}</h3>
          <p className="text-xs text-slate-400">{t('agenda.emptyHint')}</p>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          // Preserve fields not exposed in this basic form (the update handler
          // overwrites every column from the input).
          const input: AgendaItemInput = {
            ...(initial ? inputFromItem(initial) : {}),
            titlePl,
            titleEn,
            startsAt: new Date(startsAt).toISOString(),
            endsAt: new Date(endsAt).toISOString(),
            type,
            customTypeId,
            requiresCheckIn,
          }
          const it = initial
            ? await update.mutateAsync({ id: initial.id, input })
            : await create.mutateAsync(input)
          onDone(it)
        }}
        className="space-y-4"
      >
        {/* Type picker as visual grid */}
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{t('agenda.type')}</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(TYPE_META).map(([id, m]) => {
              const v = Number(id)
              const selected = !customTypeId && type === v
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setType(v)
                    setCustomTypeId(null)
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 transition ${
                    selected
                      ? 'border-indigo-400/40 bg-indigo-500/10 ring-1 ring-inset ring-indigo-400/40'
                      : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30'
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${m.gradient} text-base shadow`}>
                    {m.emoji}
                  </span>
                  <span className="text-[11px] font-medium text-slate-200">{t(m.i18nKey)}</span>
                </button>
              )
            })}
            {customTypes.map((ct) => {
              const selected = customTypeId === ct.id
              return (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => {
                    setCustomTypeId(ct.id)
                    setType(5)
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2.5 transition ${
                    selected ? 'ring-1 ring-inset ring-indigo-400/40' : 'hover:border-indigo-400/30'
                  }`}
                  style={{
                    borderColor: selected ? ct.color : undefined,
                    background: selected ? `${ct.color}22` : undefined,
                  }}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-base shadow"
                    style={{ backgroundColor: ct.color }}
                  >
                    {ct.icon || '🏷'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-200">{ct.namePl}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('agenda.titlePl')}>
            <Input value={titlePl} onChange={(e) => setTitlePl(e.target.value)} required autoFocus />
          </Field>
          <Field label={t('agenda.titleEn')}>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required />
          </Field>
          <Field label={t('events.starts')}>
            <DateTimeInput value={startsAt} onChange={setStartsAt} required />
          </Field>
          <Field label={t('events.ends')}>
            <DateTimeInput value={endsAt} onChange={setEndsAt} required />
          </Field>
        </div>

        {/* QR toggle as a card switch */}
        <button
          type="button"
          onClick={() => setRequiresCheckIn(!requiresCheckIn)}
          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
            requiresCheckIn
              ? 'border-amber-400/40 bg-amber-500/10'
              : 'border-slate-800/70 bg-slate-900/40 hover:border-indigo-400/30'
          }`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              requiresCheckIn ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-950/60 text-slate-400'
            }`}
          >
            <Icon name="qr" className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{t('agenda.requiresCheckIn')}</p>
            <p className="text-[11px] text-slate-400">{t('agenda.requiresCheckInHint')}</p>
          </div>
          <span
            className={`relative inline-block h-5 w-9 shrink-0 rounded-full transition ${
              requiresCheckIn ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white transition ${
                requiresCheckIn ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>

        <div className="flex gap-2 border-t border-slate-800/80 pt-3">
          <Button type="submit" disabled={saving}>
            <Icon name="check" className="h-3.5 w-3.5" />
            {isEdit ? t('common.save') : t('common.create')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  )
}

type TypeRow = AgendaTypeInput & { _key: string }

function AgendaTypesManager({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const { data, isLoading } = useAgendaTypes(eventId)
  if (isLoading || !data) return <Card>…</Card>
  return <AgendaTypesForm key={data.map((t) => t.id).join('-') || 'empty'} eventId={eventId} initial={data} onClose={onClose} />
}

function AgendaTypesForm({
  eventId,
  initial,
  onClose,
}: {
  eventId: string
  initial: AgendaTypeDto[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const save = useSaveAgendaTypes(eventId)
  const [rows, setRows] = useState<TypeRow[]>(() =>
    initial.map((x, i) => ({ _key: `${x.id}-${i}`, id: x.id, namePl: x.namePl, nameEn: x.nameEn, color: x.color, icon: x.icon })),
  )

  const update = (key: string, patch: Partial<TypeRow>) =>
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, ...patch } : r)))
  const add = () =>
    setRows((rs) => [
      ...rs,
      { _key: `new-${rs.length}-${performance.now()}`, id: null, namePl: '', nameEn: null, color: '#6366f1', icon: '🏷' },
    ])
  const remove = (key: string) => setRows((rs) => rs.filter((r) => r._key !== key))

  async function persist() {
    const payload: AgendaTypeInput[] = rows
      .filter((r) => r.namePl.trim().length > 0)
      .map((r) => ({ id: r.id, namePl: r.namePl.trim(), nameEn: r.nameEn?.trim() || null, color: r.color, icon: r.icon?.trim() || null }))
    await save.mutateAsync(payload)
    onClose()
  }

  return (
    <Card glow>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">{t('agenda.customTypesTitle')}</h3>
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-white">
          ✕
        </button>
      </div>
      <div className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-slate-500">{t('agenda.noCustomTypes')}</p>}
        {rows.map((r) => (
          <div key={r._key} className="flex items-center gap-2">
            <ColorPicker compact value={r.color} onChange={(v) => update(r._key, { color: v })} />
            <EmojiPicker value={r.icon ?? ''} onChange={(v) => update(r._key, { icon: v })} />
            <Input
              value={r.namePl}
              onChange={(e) => update(r._key, { namePl: e.target.value })}
              placeholder={t('agenda.typeNamePl')}
            />
            <Input
              value={r.nameEn ?? ''}
              onChange={(e) => update(r._key, { nameEn: e.target.value })}
              placeholder={t('agenda.typeNameEn')}
            />
            <button
              onClick={() => remove(r._key)}
              className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button variant="subtle" onClick={add}>
          + {t('agenda.addType')}
        </Button>
        <Button onClick={persist} disabled={save.isPending}>
          {save.isPending ? '…' : t('common.save')}
        </Button>
      </div>
    </Card>
  )
}

function ItemDetail({
  item,
  onEdit,
  onDelete,
  deleting,
}: {
  item: AgendaItemDto
  onEdit: () => void
  onDelete: () => Promise<void>
  deleting: boolean
}) {
  const { t, i18n } = useTranslation()
  const meta = TYPE_META[item.type] ?? TYPE_META[5]
  const custom = item.customTypeName
    ? {
        color: item.customTypeColor ?? '#6366f1',
        icon: item.customTypeIcon || '🏷',
        name: (i18n.resolvedLanguage === 'en' && item.customTypeNameEn) || item.customTypeName,
      }
    : null
  const start = new Date(item.startsAt)
  const end = new Date(item.endsAt)
  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl shadow-lg ${custom ? '' : `bg-gradient-to-br ${meta.gradient}`}`}
          style={custom ? { backgroundColor: custom.color } : undefined}
        >
          {custom ? custom.icon : meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-white">{item.titlePl}</h2>
          <p className="text-xs text-slate-400">{item.titleEn}</p>
        </div>
        {custom ? (
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset"
            style={{ color: custom.color, borderColor: custom.color, backgroundColor: `${custom.color}1a` }}
          >
            {custom.name}
          </span>
        ) : (
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${meta.chip}`}>
            {t(meta.i18nKey)}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
          <Icon name="clock" className="mt-0.5 h-4 w-4 text-slate-400" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{t('events.starts')}</p>
            <p className="text-sm text-white">{start.toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'short' })}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{t('events.ends')}</p>
            <p className="text-sm text-white">{end.toLocaleString(i18n.language, { dateStyle: 'full', timeStyle: 'short' })}</p>
          </div>
        </div>

        {item.locationName && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <Icon name="mapPin" className="mt-0.5 h-4 w-4 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">{t('events.location')}</p>
              <p className="text-sm text-white">{item.locationName}</p>
            </div>
          </div>
        )}

        {item.speakerName && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <Icon name="users" className="mt-0.5 h-4 w-4 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Speaker</p>
              <p className="text-sm text-white">{item.speakerName}</p>
            </div>
          </div>
        )}

        <div
          className={`flex items-center gap-3 rounded-lg border p-3 ${
            item.requiresCheckIn ? 'border-amber-400/40 bg-amber-500/10' : 'border-slate-800 bg-slate-950/40'
          }`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              item.requiresCheckIn ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-900 text-slate-500'
            }`}
          >
            <Icon name="qr" className="h-4 w-4" />
          </span>
          <p className="flex-1 text-sm font-medium text-white">
            {item.requiresCheckIn ? t('agenda.checkInActive') : t('agenda.checkInOff')}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 border-t border-slate-800/80 pt-3">
        <Button variant="subtle" onClick={onEdit}>
          ✏️ {t('common.edit')}
        </Button>
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
