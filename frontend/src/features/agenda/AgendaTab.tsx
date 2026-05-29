import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateAgendaItem, useAgenda, useDeleteAgendaItem } from './api'
import { Button, Card, Field, Input } from '../../components/ui'
import { AgendaItemTypeName } from '../../types/api'

export function AgendaTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: items, isLoading } = useAgenda(eventId)
  const createMut = useCreateAgendaItem(eventId)
  const deleteMut = useDeleteAgendaItem(eventId)

  const [titlePl, setTitlePl] = useState('')
  const [titleEn, setTitleEn] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [type, setType] = useState(0)
  const [requiresCheckIn, setRequiresCheckIn] = useState(false)

  async function add(e: React.FormEvent) {
    e.preventDefault()
    await createMut.mutateAsync({
      titlePl,
      titleEn,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      type,
      requiresCheckIn,
    })
    setTitlePl('')
    setTitleEn('')
    setStartsAt('')
    setEndsAt('')
    setType(0)
    setRequiresCheckIn(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-3 font-semibold">{t('agenda.add')}</h3>
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
          <Field label={t('agenda.titlePl')}>
            <Input value={titlePl} onChange={(e) => setTitlePl(e.target.value)} required />
          </Field>
          <Field label={t('agenda.titleEn')}>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} required />
          </Field>
          <Field label={t('events.starts')}>
            <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
          </Field>
          <Field label={t('events.ends')}>
            <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
          </Field>
          <Field label={t('agenda.type')}>
            <select
              value={type}
              onChange={(e) => setType(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(AgendaItemTypeName).map(([value, name]) => (
                <option key={value} value={value}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={requiresCheckIn}
              onChange={(e) => setRequiresCheckIn(e.target.checked)}
            />
            {t('agenda.requiresCheckIn')}
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={createMut.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (
        <div className="space-y-2">
          {(items ?? []).map((item) => (
            <Card key={item.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.titlePl}</p>
                <p className="text-sm text-slate-500">
                  {new Date(item.startsAt).toLocaleString()} · {AgendaItemTypeName[item.type]}
                  {item.requiresCheckIn ? ' · QR' : ''}
                </p>
              </div>
              <Button variant="ghost" onClick={() => deleteMut.mutate(item.id)}>
                {t('agenda.delete')}
              </Button>
            </Card>
          ))}
          {(items ?? []).length === 0 && (
            <Card>
              <p className="text-slate-500">{t('agenda.empty')}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
