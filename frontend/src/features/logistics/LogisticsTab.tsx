import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCreateTransfer, useDeleteTransfer, useTransfers } from './api'
import { Button, Card, Field, Input } from '../../components/ui'

export function LogisticsTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: transfers, isLoading } = useTransfers(eventId)
  const create = useCreateTransfer(eventId)
  const del = useDeleteTransfer(eventId)

  const [name, setName] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [note, setNote] = useState('')

  async function add(e: React.FormEvent) {
    e.preventDefault()
    await create.mutateAsync({
      name,
      departureTime: new Date(departureTime).toISOString(),
      meetingPoint,
      note: note || null,
    })
    setName('')
    setDepartureTime('')
    setMeetingPoint('')
    setNote('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="mb-3 font-semibold">{t('logistics.addTransfer')}</h3>
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
          <Field label={t('logistics.transferName')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label={t('logistics.departure')}>
            <Input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required />
          </Field>
          <Field label={t('logistics.meetingPoint')}>
            <Input value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} required />
          </Field>
          <Field label={t('logistics.note')}>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {t('common.create')}
            </Button>
          </div>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (
        <div className="space-y-2">
          {(transfers ?? []).map((tr) => (
            <Card key={tr.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{tr.name}</p>
                <p className="text-sm text-slate-500">
                  {new Date(tr.departureTime).toLocaleString()} · {tr.meetingPoint}
                </p>
              </div>
              <Button variant="ghost" onClick={() => del.mutate(tr.id)}>
                {t('agenda.delete')}
              </Button>
            </Card>
          ))}
          {(transfers ?? []).length === 0 && (
            <Card>
              <p className="text-slate-500">{t('logistics.empty')}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
