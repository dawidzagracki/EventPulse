import { useState } from 'react'
import { useStations, useSaveStations, useStationsSummary } from './api'
import { Button, Card, Field, Input, Toggle } from '../../components/ui'
import type { StationDto, StationInput } from '../../types/api'

/**
 * "Stanowiska" tab: define event stations (with optional per-participant scan limits and
 * self-scan / check-in flags) and see live activity (scans + distinct people) per station.
 */
export function StationsTab({ eventId }: { eventId: string }) {
  return (
    <div className="max-w-4xl space-y-6">
      <StationsManager eventId={eventId} />
      <StationsSummary eventId={eventId} />
    </div>
  )
}

type Row = StationInput & { _key: string }

function StationsManager({ eventId }: { eventId: string }) {
  const { data, isLoading } = useStations(eventId)
  if (isLoading || !data) return <Card>Ładowanie…</Card>
  return <StationsForm key={data.map((s) => s.id).join('-') || 'empty'} eventId={eventId} initial={data} />
}

function StationsForm({ eventId, initial }: { eventId: string; initial: StationDto[] }) {
  const save = useSaveStations(eventId)
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((s, i) => ({
      _key: `${s.id}-${i}`,
      id: s.id,
      name: s.name,
      nameEn: s.nameEn,
      icon: s.icon,
      scanLimitPerParticipant: s.scanLimitPerParticipant,
      countsAsCheckIn: s.countsAsCheckIn,
      allowSelfScan: s.allowSelfScan,
      active: s.active,
    })),
  )

  const update = (key: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, ...patch } : r)))
  const add = () =>
    setRows((rs) => [
      ...rs,
      {
        _key: `new-${rs.length}-${performance.now()}`,
        id: null,
        name: '',
        nameEn: null,
        icon: '📍',
        scanLimitPerParticipant: 0,
        countsAsCheckIn: false,
        allowSelfScan: true,
        active: true,
      },
    ])
  const remove = (key: string) => setRows((rs) => rs.filter((r) => r._key !== key))

  async function persist() {
    const payload: StationInput[] = rows
      .filter((r) => r.name.trim().length > 0)
      .map((r) => ({
        id: r.id,
        name: r.name.trim(),
        nameEn: r.nameEn?.trim() || null,
        icon: r.icon?.trim() || null,
        scanLimitPerParticipant: Math.max(0, Number(r.scanLimitPerParticipant) || 0),
        countsAsCheckIn: r.countsAsCheckIn,
        allowSelfScan: r.allowSelfScan,
        active: r.active,
      }))
    await save.mutateAsync(payload)
  }

  return (
    <Card glow>
      <h3 className="text-base font-semibold text-white">Stanowiska</h3>
      <p className="mt-1 text-sm text-slate-400">
        Zdefiniuj punkty skanowania (wejście, bar, sala…). Ustaw limit skanów na osobę (np. 2 piwa),
        czy stanowisko liczy się jako wejście oraz czy gość może sam zeskanować.
      </p>

      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-slate-500">Brak stanowisk. Dodaj pierwsze poniżej.</p>}
        {rows.map((r) => (
          <div key={r._key} className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <Input
                className="w-16 text-center"
                value={r.icon ?? ''}
                onChange={(e) => update(r._key, { icon: e.target.value })}
                placeholder="📍"
              />
              <div className="min-w-[160px] flex-1">
                <Field label="Nazwa">
                  <Input value={r.name} onChange={(e) => update(r._key, { name: e.target.value })} placeholder="BAR" />
                </Field>
              </div>
              <div className="w-28">
                <Field label="Limit / os.">
                  <Input
                    type="number"
                    min={0}
                    value={r.scanLimitPerParticipant}
                    onChange={(e) => update(r._key, { scanLimitPerParticipant: Number(e.target.value) || 0 })}
                  />
                </Field>
              </div>
              <button
                onClick={() => remove(r._key)}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
                title="Usuń"
              >
                ✕
              </button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <Toggle checked={r.countsAsCheckIn} onChange={(v) => update(r._key, { countsAsCheckIn: v })} label="Wejście (check-in)" />
              <Toggle checked={r.allowSelfScan} onChange={(v) => update(r._key, { allowSelfScan: v })} label="Samoobsługa gościa" />
              <Toggle checked={r.active} onChange={(v) => update(r._key, { active: v })} label="Aktywne" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="subtle" onClick={add}>
          + Dodaj stanowisko
        </Button>
        <Button onClick={persist} disabled={save.isPending}>
          {save.isPending ? 'Zapisywanie…' : 'Zapisz stanowiska'}
        </Button>
        {save.isSuccess && <span className="text-sm text-emerald-400">✓ Zapisano</span>}
      </div>
    </Card>
  )
}

function StationsSummary({ eventId }: { eventId: string }) {
  const { data, isLoading } = useStationsSummary(eventId)

  return (
    <Card>
      <h3 className="text-base font-semibold text-white">Podsumowanie aktywności</h3>
      <p className="mt-1 text-sm text-slate-400">Skany i liczba unikalnych osób na każdym stanowisku.</p>
      {isLoading ? (
        <p className="mt-4 text-sm text-slate-500">Ładowanie…</p>
      ) : !data || data.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Brak skanów. Dane pojawią się w trakcie wydarzenia.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((s) => (
            <div key={s.id ?? s.name} className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  {s.icon ? `${s.icon} ` : ''}
                  {s.name}
                </span>
                {!s.active && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">nieaktywne</span>}
              </div>
              <div className="mt-3 flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{s.people}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">osób</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-300">{s.scans}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">skanów</p>
                </div>
              </div>
              {s.scanLimitPerParticipant > 0 && (
                <p className="mt-2 text-[11px] text-amber-300">Limit: {s.scanLimitPerParticipant} / os.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
