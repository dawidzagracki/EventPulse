import { useState } from 'react'
import { useCustomFields, useSaveCustomFields, useOnboarding, useSaveOnboarding } from './api'
import { Button, Card, Input, Toggle } from '../../components/ui'
import {
  CustomFieldType,
  type CustomFieldDto,
  type CustomFieldInput,
  type OnboardingStepDto,
  type OnboardingStepInput,
} from '../../types/api'

/**
 * Admin editor for the participant form: custom fields ("kafelki") and the
 * pre-app onboarding steps. Both edit the whole list and save in one PUT.
 */
export function EventFormTab({ eventId }: { eventId: string }) {
  return (
    <div className="max-w-3xl space-y-6">
      <CustomFieldsEditor eventId={eventId} />
      <OnboardingEditor eventId={eventId} />
    </div>
  )
}

const TYPE_LABELS: Record<number, string> = {
  [CustomFieldType.Text]: 'Tekst',
  [CustomFieldType.Textarea]: 'Długi tekst',
  [CustomFieldType.Checkbox]: 'Tak / Nie',
  [CustomFieldType.Select]: 'Lista wyboru (jedna)',
  [CustomFieldType.MultiSelect]: 'Wielokrotny wybór',
}

// Field types that carry a comma-separated option list.
const OPTION_TYPES: number[] = [CustomFieldType.Select, CustomFieldType.MultiSelect]

const selectCls = 'w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100'

type FieldRow = CustomFieldInput & { _key: string }

function CustomFieldsEditor({ eventId }: { eventId: string }) {
  const { data, isLoading } = useCustomFields(eventId)
  if (isLoading || !data) return <Card>Ładowanie…</Card>
  return <CustomFieldsForm key={data.map((f) => f.id).join('-') || 'empty'} eventId={eventId} initial={data} />
}

function CustomFieldsForm({ eventId, initial }: { eventId: string; initial: CustomFieldDto[] }) {
  const save = useSaveCustomFields(eventId)
  const [rows, setRows] = useState<FieldRow[]>(() =>
    initial.map((f, i) => ({
      _key: `${f.id}-${i}`,
      id: f.id,
      labelPl: f.labelPl,
      labelEn: f.labelEn,
      type: f.type,
      options: f.options,
      required: f.required,
    })),
  )

  function update(key: string, patch: Partial<FieldRow>) {
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, ...patch } : r)))
  }
  function add() {
    setRows((rs) => [
      ...rs,
      { _key: `new-${rs.length}-${performance.now()}`, id: null, labelPl: '', labelEn: null, type: CustomFieldType.Text, options: [], required: false },
    ])
  }
  function remove(key: string) {
    setRows((rs) => rs.filter((r) => r._key !== key))
  }

  async function persist() {
    const payload: CustomFieldInput[] = rows
      .filter((r) => r.labelPl.trim().length > 0)
      .map((r) => ({
        id: r.id,
        labelPl: r.labelPl.trim(),
        labelEn: r.labelEn?.trim() || null,
        type: r.type,
        options: OPTION_TYPES.includes(r.type) ? (r.options ?? []).filter((o) => o.trim()) : null,
        required: r.required,
      }))
    await save.mutateAsync(payload)
  }

  return (
    <Card glow>
      <h3 className="text-base font-semibold text-white">Customowe pola (kafelki)</h3>
      <p className="mt-1 text-sm text-slate-400">
        Dodatkowe pola, które uczestnik uzupełni w aplikacji (np. rozmiar buta, alergie, własne pytania).
      </p>

      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-slate-500">Brak pól. Dodaj pierwsze poniżej.</p>}
        {rows.map((r) => (
          <div key={r._key} className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input
                placeholder="Nazwa pola (np. Rozmiar buta)"
                value={r.labelPl}
                onChange={(e) => update(r._key, { labelPl: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <select
                  className={selectCls}
                  value={r.type}
                  onChange={(e) => update(r._key, { type: Number(e.target.value) })}
                >
                  {Object.entries(TYPE_LABELS).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => remove(r._key)}
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-sm text-rose-300 hover:bg-rose-500/20"
                  title="Usuń pole"
                >
                  ✕
                </button>
              </div>
            </div>
            {OPTION_TYPES.includes(r.type) && (
              <Input
                className="mt-2"
                placeholder="Opcje oddzielone przecinkami (np. S, M, L, XL)"
                value={(r.options ?? []).join(', ')}
                onChange={(e) => update(r._key, { options: e.target.value.split(',').map((o) => o.trim()) })}
              />
            )}
            <div className="mt-2">
              <Toggle checked={r.required} onChange={(v) => update(r._key, { required: v })} label="Wymagane" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="subtle" onClick={add}>
          + Dodaj pole
        </Button>
        <Button onClick={persist} disabled={save.isPending}>
          {save.isPending ? 'Zapisywanie…' : 'Zapisz pola'}
        </Button>
        {save.isSuccess && <span className="text-sm text-emerald-400">✓ Zapisano</span>}
      </div>
    </Card>
  )
}

type StepRow = OnboardingStepInput & { _key: string }

function OnboardingEditor({ eventId }: { eventId: string }) {
  const { data, isLoading } = useOnboarding(eventId)
  if (isLoading || !data) return <Card>Ładowanie…</Card>
  return <OnboardingForm key={data.map((s) => s.id).join('-') || 'empty'} eventId={eventId} initial={data} />
}

function OnboardingForm({ eventId, initial }: { eventId: string; initial: OnboardingStepDto[] }) {
  const save = useSaveOnboarding(eventId)
  const [rows, setRows] = useState<StepRow[]>(() =>
    initial.map((s, i) => ({
      _key: `${s.id}-${i}`,
      titlePl: s.titlePl,
      titleEn: s.titleEn,
      bodyPl: s.bodyPl,
      bodyEn: s.bodyEn,
      requireConfirm: s.requireConfirm,
    })),
  )

  function update(key: string, patch: Partial<StepRow>) {
    setRows((rs) => rs.map((r) => (r._key === key ? { ...r, ...patch } : r)))
  }
  function add() {
    setRows((rs) => [
      ...rs,
      { _key: `new-${rs.length}-${performance.now()}`, titlePl: '', titleEn: null, bodyPl: null, bodyEn: null, requireConfirm: false },
    ])
  }
  function remove(key: string) {
    setRows((rs) => rs.filter((r) => r._key !== key))
  }

  async function persist() {
    const payload: OnboardingStepInput[] = rows
      .filter((r) => r.titlePl.trim().length > 0)
      .map((r) => ({
        titlePl: r.titlePl.trim(),
        titleEn: r.titleEn?.trim() || null,
        bodyPl: r.bodyPl?.trim() || null,
        bodyEn: r.bodyEn?.trim() || null,
        requireConfirm: r.requireConfirm,
      }))
    await save.mutateAsync(payload)
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-white">Onboarding przed wejściem</h3>
      <p className="mt-1 text-sm text-slate-400">
        Ekrany powitalne pokazywane uczestnikowi zaraz po wejściu z linku (tak jak agenda przed logowaniem).
      </p>

      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-slate-500">Brak ekranów onboardingu.</p>}
        {rows.map((r, i) => (
          <div key={r._key} className="rounded-xl border border-slate-800/70 bg-slate-900/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Ekran {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(r._key)}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
              >
                ✕ Usuń
              </button>
            </div>
            <Input
              placeholder="Tytuł ekranu"
              value={r.titlePl}
              onChange={(e) => update(r._key, { titlePl: e.target.value })}
            />
            <textarea
              className="mt-2 w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              rows={3}
              placeholder="Treść (opcjonalnie)"
              value={r.bodyPl ?? ''}
              onChange={(e) => update(r._key, { bodyPl: e.target.value })}
            />
            <div className="mt-2">
              <Toggle
                checked={r.requireConfirm}
                onChange={(v) => update(r._key, { requireConfirm: v })}
                label="Wymagaj potwierdzenia"
                description="Uczestnik musi zaznaczyć zgodę/checkbox, aby przejść dalej."
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button variant="subtle" onClick={add}>
          + Dodaj ekran
        </Button>
        <Button onClick={persist} disabled={save.isPending}>
          {save.isPending ? 'Zapisywanie…' : 'Zapisz onboarding'}
        </Button>
        {save.isSuccess && <span className="text-sm text-emerald-400">✓ Zapisano</span>}
      </div>
    </Card>
  )
}
