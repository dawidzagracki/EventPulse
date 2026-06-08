# Przepływy przekrojowe — Multi-tenant, Bezpieczeństwo, Role (spec §6)

Testy: `TenantIsolationTests.cs`, `AuthEndpointsTests.cs`, `ArchitectureTests/*`

## CC-1 — Multi-tenant: izolacja danych (§6.4 obsługa wielu wydarzeń)
1. Każda encja `TenantEntity` ma globalny filtr zapytań po `TenantId`.
2. Tenant nie widzi danych innego tenanta.
- ✅ Test: `TenantIsolationTests.Tenant_cannot_read_another_tenants_events`, `Events_are_isolated_between_tenants`, `TenantId_is_stamped_automatically_on_insert`
- ✅ Model: `TenantIsolationModelTests.Every_tenant_entity_has_a_global_query_filter`, `There_is_at_least_one_tenant_entity_mapped`

## CC-2 — Oddzielna autentykacja (§6.3)
- Pracownik/Klient: login + hasło (JWT). Gość: token w linku / kod QR.
- ✅ Test: `AuthEndpointsTests.Login_returns_tokens...`, `Login_with_wrong_password_returns_401`, `Me_requires_authentication`, `Me_returns_claims_when_authenticated`, `Invalid_participant_token_is_rejected`

## CC-3 — Autoryzacja per-rola (guardy)
- `/events*`, `/scanner` → Agency + Client. `/me*` → Participant. Publiczne → anonim.
- ✅ Guardy: `App.tsx` (`adminGuard`), `ProtectedRoute.tsx`; backend `[Authorize(Policy=...)]`.
- ✅ Test: `ScanningEndpointsTests.Requires_authentication` (skan wymaga auth), `Me_requires_authentication`.

## CC-4 — Architektura (modular monolith)
- Moduły nie zależą od Infrastructure; Infrastructure nie zależy od API.
- ✅ Test: `DependencyRuleTests.Modules_should_not_depend_on_infrastructure`, `Infrastructure_should_not_depend_on_the_api_host`

## CC-5 — Kody QR unikalne/niepodrabialne (UUID) (§6.3)
- `AccessToken` = `Guid.NewGuid()` per uczestnik.
- ✅ Pokryte przez PE-4 / scanning (token = GUID, `extractToken` waliduje format).

## CC-6 — HTTPS / nagłówki / rate limiting (§6.3)
- Security headers + rate limiter (poza Development) w `Program.cs`.
- 🟡 Konfiguracja hostingu; weryfikacja manualna / e2e na wdrożeniu.

## CC-7 — Tryb klienta (skrócony UI)
- Client: skrócone menu (5 zakładek), welcome stripe, redirect gdy ma 1 event (UI).
- ❌ **LUKA bezpieczeństwa**: backend `ListEventsQuery` NIE filtruje po `clientEmail` —
  Klient widzi i może otworzyć WSZYSTKIE wydarzenia tenanta. Patrz COMPLIANCE „Priorytetowe luki #1".
  Redirect UI działa tylko gdy lista ma dokładnie 1 pozycję.
