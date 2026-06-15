import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppShell, type NavItem } from '../../components/AppShell'
import { Button, Card, Field, Input, Select, Badge } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { useEvents } from '../events/api'
import {
  useAdmins, useClients, useCreateAdmin, useCreateClient, useUpdateAdmin, useUpdateClient, generateOperatorLink,
  type CreateAdminRequest, type CreateClientRequest, type AdminDto, type ClientDto,
} from './api'

function errMsg(e: unknown): string {
  const r = (e as { response?: { data?: { detail?: string; title?: string; errors?: Record<string, string[]> } } })?.response?.data
  if (r?.errors) return Object.values(r.errors).flat().join(' ')
  return r?.detail || r?.title || 'Coś poszło nie tak.'
}

export function TeamPage() {
  const { t } = useTranslation()
  const nav: NavItem[] = [
    { id: 'events', label: t('events.title'), icon: 'calendar', to: '/events' },
    { id: 'team', label: t('team.title'), icon: 'users', to: '/team', active: true },
  ]
  return (
    <AppShell nav={nav} title={t('team.title')} subtitle={t('team.subtitle')}>
      <div className="grid gap-5 lg:grid-cols-2">
        <AdminsCard />
        <ClientsCard />
        <OperatorsCard />
      </div>
    </AppShell>
  )
}

// ============ Organizatorzy (Super admini) ============
function AdminsCard() {
  const { t } = useTranslation()
  const { data: admins } = useAdmins()
  const create = useCreateAdmin()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreateAdminRequest>({ email: '', displayName: '', password: '', role: 'Admin' })
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setDone(null)
    try {
      await create.mutateAsync({ ...form, role: 'Admin' })
      setDone(t('team.created', { name: form.displayName }))
      setForm({ email: '', displayName: '', password: '', role: 'Admin' }); setOpen(false)
    } catch (e) { setErr(errMsg(e)) }
  }

  return (
    <Card>
      <SectionHead icon="shield" grad="from-violet-500 to-fuchsia-500" title={t('team.admins')} hint={t('team.adminsHint')}
        action={<Button variant="ghost" onClick={() => { setOpen(v => !v); setErr(null); setDone(null) }}><Icon name="plus" className="h-4 w-4" /> {t('team.addAdmin')}</Button>} />
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <Field label={t('team.displayName')}><Input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} required placeholder="Jan Kowalski" /></Field>
          <Field label={t('team.email')}><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="jan@agencja.pl" /></Field>
          <Field label={t('team.password')}><Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder={t('team.passwordHint')} /></Field>
          {err && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
          <Button type="submit" disabled={create.isPending} className="w-full justify-center">{t('team.create')}</Button>
        </form>
      )}
      {done && <Done msg={done} />}
      <ul className="mt-4 space-y-2">
        {(admins ?? []).map(a => <AdminRow key={a.id} admin={a} />)}
      </ul>
    </Card>
  )
}

function AdminRow({ admin }: { admin: AdminDto }) {
  const { t } = useTranslation()
  const update = useUpdateAdmin()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(admin.displayName)
  const [role, setRole] = useState<'Admin' | 'EventStaff'>(admin.role === 'EventStaff' ? 'EventStaff' : 'Admin')
  const [isActive, setIsActive] = useState(admin.isActive)
  const [newPassword, setNewPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    try {
      await update.mutateAsync({ id: admin.id, body: { displayName, role, isActive, newPassword: newPassword || undefined } })
      setNewPassword(''); setEditing(false)
    } catch (e) { setErr(errMsg(e)) }
  }

  if (!editing) {
    return (
      <Row grad="from-violet-500/30 to-fuchsia-500/30 ring-violet-400/40" name={admin.displayName} sub={admin.email}
        badge={
          <div className="flex items-center gap-2">
            {!admin.isActive && <Badge tone="warning">{t('team.inactive')}</Badge>}
            <Badge tone="accent">{admin.role === 'Admin' ? t('team.roleAdmin') : t('team.roleStaff')}</Badge>
            <button onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-white">{t('team.edit')}</button>
          </div>
        } />
    )
  }

  return (
    <li className="rounded-lg border border-violet-500/30 bg-slate-950/50 p-3">
      <div className="space-y-2">
        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
        <div className="flex gap-2">
          <Select value={role} onChange={e => setRole(e.target.value as 'Admin' | 'EventStaff')} className="flex-1">
            <option value="Admin">{t('team.roleAdmin')}</option>
            <option value="EventStaff">{t('team.roleStaff')}</option>
          </Select>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> {t('team.activeAccount')}
          </label>
        </div>
        <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('team.newPasswordOptional')} />
        {err && <p className="text-xs text-rose-300">{err}</p>}
        <div className="flex gap-2">
          <Button onClick={save} disabled={update.isPending} className="flex-1 justify-center">{t('team.save')}</Button>
          <Button variant="ghost" onClick={() => { setEditing(false); setErr(null) }}>{t('team.cancel')}</Button>
        </div>
      </div>
    </li>
  )
}

// ============ Klienci (mini-admin) ============
function ClientsCard() {
  const { t } = useTranslation()
  const { data: clients } = useClients()
  const create = useCreateClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreateClientRequest>({ email: '', displayName: '', password: '' })
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(null); setDone(null)
    try {
      await create.mutateAsync(form)
      setDone(t('team.created', { name: form.displayName }))
      setForm({ email: '', displayName: '', password: '' }); setOpen(false)
    } catch (e) { setErr(errMsg(e)) }
  }

  return (
    <Card>
      <SectionHead icon="users" grad="from-sky-500 to-cyan-500" title={t('team.clients')} hint={t('team.clientsHint')}
        action={<Button variant="ghost" onClick={() => { setOpen(v => !v); setErr(null); setDone(null) }}><Icon name="plus" className="h-4 w-4" /> {t('team.addClient')}</Button>} />
      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
          <Field label={t('team.displayName')}><Input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} required placeholder="Firma / osoba kontaktowa" /></Field>
          <Field label={t('team.email')}><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required placeholder="kontakt@firma.pl" /></Field>
          <Field label={t('team.password')}><Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder={t('team.passwordHint')} /></Field>
          <p className="text-xs text-slate-500">{t('team.clientLinkHint')}</p>
          {err && <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
          <Button type="submit" disabled={create.isPending} className="w-full justify-center">{t('team.create')}</Button>
        </form>
      )}
      {done && <Done msg={done} />}
      <ul className="mt-4 space-y-2">
        {(clients ?? []).length === 0 && <Empty msg={t('team.noClients')} />}
        {(clients ?? []).map(c => <ClientRow key={c.id} client={c} />)}
      </ul>
    </Card>
  )
}

function ClientRow({ client }: { client: ClientDto }) {
  const { t } = useTranslation()
  const update = useUpdateClient()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(client.displayName)
  const [isActive, setIsActive] = useState(client.isActive)
  const [newPassword, setNewPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    try {
      await update.mutateAsync({ id: client.id, body: { displayName, isActive, newPassword: newPassword || undefined } })
      setNewPassword(''); setEditing(false)
    } catch (e) { setErr(errMsg(e)) }
  }

  if (!editing) {
    return (
      <Row grad="from-sky-500/30 to-cyan-500/30 ring-sky-400/40" name={client.displayName} sub={client.email}
        badge={
          <div className="flex items-center gap-2">
            {!client.isActive && <Badge tone="warning">{t('team.inactive')}</Badge>}
            <Badge tone={client.isActivated ? 'success' : 'warning'}>{client.isActivated ? t('team.active') : t('team.pending')}</Badge>
            <button onClick={() => setEditing(true)} className="text-xs text-slate-400 hover:text-white">{t('team.edit')}</button>
          </div>
        } />
    )
  }

  return (
    <li className="rounded-lg border border-sky-500/30 bg-slate-950/50 p-3">
      <div className="space-y-2">
        <Input value={displayName} onChange={e => setDisplayName(e.target.value)} />
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} /> {t('team.activeAccount')}
        </label>
        <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={t('team.newPasswordOptional')} />
        {err && <p className="text-xs text-rose-300">{err}</p>}
        <div className="flex gap-2">
          <Button onClick={save} disabled={update.isPending} className="flex-1 justify-center">{t('team.save')}</Button>
          <Button variant="ghost" onClick={() => { setEditing(false); setErr(null) }}>{t('team.cancel')}</Button>
        </div>
      </div>
    </li>
  )
}

// ============ Operatorzy (tylko skaner, przez link) ============
function OperatorsCard() {
  const { t } = useTranslation()
  const { data: events } = useEvents()
  const [eventId, setEventId] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function generate() {
    if (!eventId) return
    setBusy(true); setErr(null); setLink(null); setCopied(false)
    try {
      const res = await generateOperatorLink(eventId)
      setLink(`${window.location.origin}/op/${res.accessToken}`)
    } catch (e) { setErr(errMsg(e)) } finally { setBusy(false) }
  }

  async function copy() {
    if (!link) return
    try { await navigator.clipboard.writeText(link); setCopied(true) } catch { /* clipboard blocked */ }
  }

  return (
    <Card className="lg:col-span-2">
      <SectionHead icon="qr" grad="from-emerald-500 to-teal-500" title={t('team.operators')} hint={t('team.operatorsHint')} />
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Field label={t('team.operatorPickEvent')}>
            <Select value={eventId} onChange={e => { setEventId(e.target.value); setLink(null) }}>
              <option value="">—</option>
              {(events ?? []).map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </Select>
          </Field>
        </div>
        <Button onClick={generate} disabled={!eventId || busy}>
          <Icon name="qr" className="h-4 w-4" /> {t('team.operatorGenerate')}
        </Button>
      </div>
      {(events ?? []).length === 0 && <p className="mt-2 text-xs text-slate-500">{t('team.operatorNoEvents')}</p>}
      {err && <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{err}</p>}
      {link && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-200">{t('team.operatorLinkReady')}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-emerald-200">{link}</code>
            <Button variant="subtle" onClick={copy}>{copied ? t('team.operatorCopied') : t('team.operatorCopy')}</Button>
          </div>
          <p className="mt-2 text-xs text-slate-400">⏱ {t('team.operatorExpires')}</p>
        </div>
      )}
    </Card>
  )
}

// ============ helpers ============
function SectionHead({ icon, grad, title, hint, action }: { icon: 'shield' | 'users' | 'qr'; grad: string; title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-lg`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-xs text-slate-400">{hint}</p>
      </div>
      {action}
    </div>
  )
}

function Row({ grad, name, sub, badge }: { grad: string; name: string; sub: string; badge: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${grad} text-xs font-bold text-white ring-1 ring-inset`}>
        {name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        <p className="truncate text-xs text-slate-500">{sub}</p>
      </div>
      {badge}
    </li>
  )
}

function Empty({ msg }: { msg: string }) {
  return <li className="rounded-lg border border-dashed border-slate-800 px-3 py-6 text-center text-sm text-slate-500">{msg}</li>
}

function Done({ msg }: { msg: string }) {
  return <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{msg}</p>
}
