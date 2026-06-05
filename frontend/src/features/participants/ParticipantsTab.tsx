import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  downloadTemplate,
  openParticipantQr,
  useAddParticipant,
  useImportParticipants,
  useParticipants,
  useSendInvitations,
} from './api'
import { Button, Card, Field, Input } from '../../components/ui'
import { FileButton } from '../../components/FileButton'
import { Icon } from '../../components/Icon'
import { ParticipantStatusName, type ImportResult } from '../../types/api'

export function ParticipantsTab({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const { data: participants, isLoading } = useParticipants(eventId)
  const importMut = useImportParticipants(eventId)
  const addMut = useAddParticipant(eventId)
  const inviteMut = useSendInvitations(eventId)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  async function runImport(commit: boolean) {
    if (!file) return
    const res = await importMut.mutateAsync({ file, commit })
    setResult(res)
    if (commit) {
      setFile(null)
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    await addMut.mutateAsync({ firstName, lastName, email })
    setFirstName('')
    setLastName('')
    setEmail('')
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-semibold text-white">{t('participants.import')}</h3>
          <Button variant="ghost" onClick={() => downloadTemplate(eventId)}>
            <Icon name="document" className="h-3.5 w-3.5" />
            {t('participants.template')}
          </Button>
          <Button variant="ghost" onClick={() => inviteMut.mutate()} disabled={inviteMut.isPending}>
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            {t('participants.invite')}
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
        {inviteMut.data && (
          <p className="mt-2 text-sm text-emerald-700">
            {t('participants.invited', { count: inviteMut.data.sentCount })}
          </p>
        )}
        {result && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
            <p>
              {t('participants.rows')}: {result.totalRows} · {t('participants.valid')}: {result.validRows} ·{' '}
              {t('participants.importedCount')}: {result.importedCount}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-red-600">
                {result.errors.map((er, i) => (
                  <li key={i}>
                    {t('participants.row')} {er.rowNumber}: {er.message}
                  </li>
                ))}
              </ul>
            )}
            {result.duplicateEmails.length > 0 && (
              <p className="mt-1 text-amber-700">
                {t('participants.duplicates')}: {result.duplicateEmails.join(', ')}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">{t('participants.add')}</h3>
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <Field label={t('participants.firstName')}>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </Field>
          <Field label={t('participants.lastName')}>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </Field>
          <Field label={t('auth.email')}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Button type="submit" disabled={addMut.isPending}>
            {t('common.create')}
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-slate-500">{t('common.loading')}</p>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-4 py-2">{t('participants.name')}</th>
                <th className="px-4 py-2">{t('auth.email')}</th>
                <th className="px-4 py-2">{t('events.status')}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(participants ?? []).map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-4 py-2">
                    {p.firstName} {p.lastName}
                  </td>
                  <td className="px-4 py-2">{p.email}</td>
                  <td className="px-4 py-2">{ParticipantStatusName[p.status]}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" onClick={() => openParticipantQr(eventId, p.id)}>
                      QR
                    </Button>
                  </td>
                </tr>
              ))}
              {(participants ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    {t('participants.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
