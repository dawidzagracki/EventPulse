import { useState } from 'react'
import { useEvent, useUpdateEventSettings, useUpdateEventSlug, type UpdateEventSettingsRequest } from './api'
import { Button, Card, Field, Input, Toggle } from '../../components/ui'
import type { EventDto } from '../../types/api'

/**
 * Per-event settings: privacy / location data, phone requirement, companions,
 * automatic anonymization, and the custom photos link/text shown in the participant app.
 */
export function SettingsTab({ eventId }: { eventId: string }) {
  const { data: event, isLoading } = useEvent(eventId)
  if (isLoading || !event) return <p className="text-slate-500">Ładowanie…</p>
  // Remount the form when the server copy changes so initial state stays in sync.
  return <SettingsForm key={event.updatedAt ?? event.id} eventId={eventId} event={event} />
}

function SettingsForm({ eventId, event }: { eventId: string; event: EventDto }) {
  const update = useUpdateEventSettings(eventId)
  const [form, setForm] = useState<UpdateEventSettingsRequest>(() => serverForm(event.settings))

  const set = <K extends keyof UpdateEventSettingsRequest>(key: K, value: UpdateEventSettingsRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  async function save() {
    await update.mutateAsync(form)
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(serverForm(event.settings))

  return (
    <div className="max-w-3xl space-y-5">
      <SlugCard eventId={eventId} initialSlug={event.slug} />

      {/* Prywatność / dane lokalizacyjne */}
      <Card glow>
        <h3 className="text-base font-semibold text-white">Prywatność i dane</h3>
        <p className="mt-1 text-sm text-slate-400">
          Steruje tym, jakie dane są zbierane i jak długo są przechowywane po wydarzeniu.
        </p>
        <div className="mt-4 space-y-4">
          <Toggle
            checked={form.usesLocationData}
            onChange={(v) => set('usesLocationData', v)}
            label="Wykorzystuj dane lokalizacyjne (skany stanowisk)"
            description="Gdy włączone, uczestnik widzi w aplikacji informację, że dane o jego obecności na stanowiskach NIE będą używane po zakończeniu wydarzenia."
          />
          <div className="border-t border-slate-800/70 pt-4">
            <Toggle
              checked={form.anonymizeEnabled}
              onChange={(v) => set('anonymizeEnabled', v)}
              label="Automatyczna anonimizacja danych po wydarzeniu"
              description="Po upływie ustawionego czasu od końca wydarzenia dane osobowe (imię, e-mail, telefon, notatki) zostaną wyczyszczone. Statystyki (liczby check-inów itd.) pozostają w formie zanonimizowanej."
            />
            {form.anonymizeEnabled && (
              <div className="mt-3 max-w-xs">
                <Field label="Anonimizuj po (dni od końca wydarzenia)">
                  <Input
                    type="number"
                    min={1}
                    max={3650}
                    value={form.anonymizeAfterDays}
                    onChange={(e) => set('anonymizeAfterDays', Number(e.target.value) || 0)}
                  />
                </Field>
                {event.settings.anonymizedAt && (
                  <p className="mt-2 text-xs text-amber-300">
                    Dane tego wydarzenia zostały już zanonimizowane{' '}
                    {new Date(event.settings.anonymizedAt).toLocaleString('pl-PL')}.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Telefon */}
      <Card>
        <h3 className="text-base font-semibold text-white">Numer telefonu uczestnika</h3>
        <p className="mt-1 text-sm text-slate-400">
          Telefon jest zbierany opcjonalnie podczas akceptacji zgód (RODO). Możesz uczynić go wymaganym.
        </p>
        <div className="mt-4">
          <Toggle
            checked={form.phoneRequired}
            onChange={(v) => set('phoneRequired', v)}
            label="Numer telefonu wymagany"
            description="Uczestnik nie przejdzie dalej bez podania numeru telefonu."
          />
        </div>
      </Card>

      {/* Osoby towarzyszące */}
      <Card>
        <h3 className="text-base font-semibold text-white">Osoby towarzyszące</h3>
        <p className="mt-1 text-sm text-slate-400">
          Pozwól uczestnikom dodawać osoby towarzyszące (np. rodzinę) z własnymi kodami QR.
        </p>
        <div className="mt-4 space-y-4">
          <Toggle
            checked={form.allowCompanions}
            onChange={(v) => set('allowCompanions', v)}
            label="Zezwól na dodawanie osób towarzyszących"
            description="Dotyczy całego wydarzenia."
          />
          {form.allowCompanions && (
            <div className="max-w-xs">
              <Field label="Maksymalna liczba osób na uczestnika (0 = bez limitu)">
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={form.maxCompanions}
                  onChange={(e) => set('maxCompanions', Number(e.target.value) || 0)}
                />
              </Field>
            </div>
          )}
        </div>
      </Card>

      {/* Zdjęcia */}
      <Card>
        <h3 className="text-base font-semibold text-white">Zdjęcia w aplikacji uczestnika</h3>
        <p className="mt-1 text-sm text-slate-400">
          Zamiast wbudowanej galerii możesz pokazać uczestnikom zewnętrzny link do zdjęć lub informację tekstową.
        </p>
        <div className="mt-4 space-y-4">
          <Field label="Link do zdjęć (np. Google Photos, dysk)">
            <Input
              type="url"
              placeholder="https://photos.app.goo.gl/…"
              value={form.customPhotosUrl ?? ''}
              onChange={(e) => set('customPhotosUrl', e.target.value || null)}
            />
          </Field>
          <Field label="Informacja tekstowa (opcjonalnie)">
            <textarea
              className="w-full rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-400/20"
              rows={3}
              placeholder="Zdjęcia z wydarzenia pojawią się tutaj w ciągu 7 dni…"
              value={form.customPhotosText ?? ''}
              onChange={(e) => set('customPhotosText', e.target.value || null)}
            />
          </Field>
        </div>
      </Card>

      {/* Panele w aplikacji uczestnika */}
      <Card>
        <h3 className="text-base font-semibold text-white">Panele w aplikacji uczestnika</h3>
        <p className="mt-1 text-sm text-slate-400">
          Ukryj zakładki, których nie używasz na tym wydarzeniu. Zakładki „Mój QR" i „Profil" są zawsze widoczne.
        </p>
        <div className="mt-4 space-y-4">
          <Toggle
            checked={form.showAgendaTab}
            onChange={(v) => set('showAgendaTab', v)}
            label="Agenda"
            description="Plan wydarzenia w aplikacji gościa."
          />
          <Toggle
            checked={form.showActivitiesTab}
            onChange={(v) => set('showActivitiesTab', v)}
            label="Aktywności"
            description="Quizy, konkursy, networking, ocena i asystent AI."
          />
          <Toggle
            checked={form.showGalleryTab}
            onChange={(v) => set('showGalleryTab', v)}
            label="Galeria"
            description="Zdjęcia z wydarzenia (lub Twój link do zdjęć)."
          />
          <Toggle
            checked={form.showPreferencesTile}
            onChange={(v) => set('showPreferencesTile', v)}
            label="Preferencje (w Profilu)"
            description="Kafelek preferencji gościa: język, dieta, rozmiar koszulki, transfer."
          />
        </div>
      </Card>

      {/* Rejestracja przez stronę */}
      <Card>
        <h3 className="text-base font-semibold text-white">Rejestracja przez stronę</h3>
        <p className="mt-1 text-sm text-slate-400">
          Strona logowania wydarzenia (/e/…/login) zawsze wysyła osobisty link osobom z listy gości.
        </p>
        <div className="mt-4">
          <Toggle
            checked={form.allowSelfRegistration}
            onChange={(v) => set('allowSelfRegistration', v)}
            label="Otwarta rejestracja (samodzielne zapisy)"
            description="Gdy włączone: osoba spoza listy może podać imię, nazwisko i e-mail — zostanie dodana do listy gości i dostanie mailem swój link do aplikacji. Gdy wyłączone: linki dostają tylko osoby już będące na liście."
          />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty || update.isPending}>
          {update.isPending ? 'Zapisywanie…' : 'Zapisz ustawienia'}
        </Button>
        {update.isSuccess && !dirty && <span className="text-sm text-emerald-400">✓ Zapisano</span>}
        {update.isError && <span className="text-sm text-rose-400">Nie udało się zapisać.</span>}
      </div>
    </div>
  )
}

function SlugCard({ eventId, initialSlug }: { eventId: string; initialSlug: string }) {
  const update = useUpdateEventSlug(eventId)
  const [slug, setSlug] = useState(initialSlug)
  const publicUrl = `${window.location.origin}/public/${slug}`

  async function save() {
    const saved = await update.mutateAsync(slug)
    setSlug(saved.slug) // the server normalizes (transliterates, lowercases)
  }

  return (
    <Card glow>
      <h3 className="text-base font-semibold text-white">Adres strony (URL)</h3>
      <p className="mt-1 text-sm text-slate-400">
        Zamiast długiego identyfikatora ustaw przyjazny adres strony wydarzenia.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <Field label="Slug">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-slate-500">/public/</span>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="falp-gala-2026" />
            </div>
          </Field>
        </div>
        <Button onClick={save} disabled={update.isPending || !slug.trim() || slug === initialSlug}>
          {update.isPending ? 'Zapisywanie…' : 'Zapisz adres'}
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:underline">
          {publicUrl}
        </a>
        {update.isSuccess && <span className="text-emerald-400">✓ Zapisano</span>}
        {update.isError && <span className="text-rose-400">Ten adres jest zajęty lub nieprawidłowy.</span>}
      </div>
    </Card>
  )
}

function serverForm(s: import('../../types/api').EventSettingsDto): UpdateEventSettingsRequest {
  return {
    usesLocationData: s.usesLocationData,
    phoneRequired: s.phoneRequired,
    allowCompanions: s.allowCompanions,
    maxCompanions: s.maxCompanions,
    anonymizeEnabled: s.anonymizeEnabled,
    anonymizeAfterDays: s.anonymizeAfterDays,
    customPhotosUrl: s.customPhotosUrl,
    customPhotosText: s.customPhotosText,
    showAgendaTab: s.showAgendaTab,
    showActivitiesTab: s.showActivitiesTab,
    showGalleryTab: s.showGalleryTab,
    showPreferencesTile: s.showPreferencesTile,
    allowSelfRegistration: s.allowSelfRegistration,
  }
}
