# Przepływy — Zarządzanie wydarzeniami (spec §2.1)

UI: `frontend/src/features/events/{EventsListPage,EventDetailPage,SmartEventForm}.tsx`
API: `backend/src/EventPulse.Api/Controllers/EventsController.cs`
Testy: `tests/EventPulse.IntegrationTests/EventsEndpointsTests.cs`, `EventDomainTests.cs`

## AE-1 — Logowanie pracownika
1. Pracownik wchodzi na `/login`, podaje e-mail + hasło.
2. POST `/api/auth/login` → access + refresh token, `principalType: Agency`.
3. Redirect na `/events`.
- ✅ Test: `AuthEndpointsTests.Login_returns_tokens_for_seeded_admin`, `Login_with_wrong_password_returns_401`

## AE-2 — Tworzenie wydarzenia
1. „+ Nowe wydarzenie" → `SmartEventForm` (presety dat, auto-koniec +4h, walidacja na żywo).
2. POST `/api/events` `{name, startsAt, endsAt, location?, clientEmail?}`.
3. System nadaje unikalny **slug** (np. `gala-2026`) → publiczny URL `/public/events/{id}` / `/{slug}`.
4. Karta pojawia się na liście.
- ✅ Test: `EventsEndpointsTests.Create_then_get_and_list` (tworzy, pobiera, listuje, slug)
- ✅ Test domenowy: `EventDomainTests` (slug, walidacja dat)

## AE-3 — Edycja wydarzenia
1. Inline rename na Dashboard/Overview lub PUT przez panel.
2. PUT `/api/events/{id}` z pełnym body.
- ✅ Test: `EventsEndpointsTests` (update ścieżka) — `useUpdateEvent` w UI; 🟡 dedykowany assert edycji nazwy: patrz COMPLIANCE.

## AE-4 — Zmiana statusu / archiwizacja (Draft→Published→Live→Completed→Archived)
1. POST `/api/events/{id}/status` `{status}`.
2. Status pill aktualizuje się; Published+ udostępnia stronę publiczną.
- 🟡 → ✅ po dodaniu testu `SpecComplianceTests.Event_can_be_archived_via_status` (ten commit).

## AE-5 — Usunięcie wydarzenia
- ❌ **LUKA** — brak `HttpDelete` w `EventsController`. Spec §2.1 wymienia „usunięcie".
  Obecnie realizowane miękko przez status `Archived`. Patrz COMPLIANCE (rekomendacja).

## AE-6 — Lista i statusy wszystkich wydarzeń (dashboard główny)
1. GET `/api/events` → wszystkie wydarzenia tenanta (Agency) / przypisane (Client).
2. UI: staty (Wszystkie/Live/Opublikowane/Szkice), filtry, search, sekcje Upcoming/Past.
- ✅ Test: `Create_then_get_and_list`; izolacja: `TenantIsolationTests.Tenant_cannot_read_another_tenants_events`
