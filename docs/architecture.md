# EventPulse — architektura (MVP)

## Cel i ograniczenia
- Produkcja na **2026-07-05**, realizacja jednoosobowa → priorytet: niezawodność i tempo, zakres cięty (MVP-Core), nie jakość.
- Hosting: **OVHcloud**. Pełny parytet lokalny przez Docker.

## Styl: modular monolith
Jeden deployowalny backend `.NET 10` podzielony na moduły (vertical slices), komunikacja in-process przez **MediatR** (komendy/zapytania + domain events). Granice modułów utrzymywane w kodzie (osobne projekty), więc ewentualne wydzielenie usług jest możliwe później. Mikroserwisy świadomie odrzucone (koszt ops przy solo + termin).

### Moduły
`Identity` · `Events` · `Participants` · `Content` (page builder + agenda) · `Logistics` · `Engagement` · `Scanning` · `Notifications` · `Analytics` · `Ai`
Wspólne: `Shared` (multi-tenancy, domain events, outbox, abstrakcje) · `Infrastructure` (EF, Postgres, Redis, Hangfire, S3, email).

## Multi-tenancy (rdzeń bezpieczeństwa)
- Row-level: encje tenant-scoped dziedziczą po `TenantEntity { TenantId }`.
- `ITenantContext` rozwiązywany w middleware z claimu JWT.
- EF Core **global query filter** automatycznie filtruje po `TenantId` — nie do zapomnienia.
- Wymuszane testami: test architektoniczny (każda tenant-encja ma filtr) + integracyjny test izolacji (tenant A nie widzi danych B) w CI.

## Tożsamość i dostęp
- Agencja/pracownik: JWT + refresh, hasło.
- Klient końcowy: JWT + refresh, hasło ustawiane linkiem aktywacyjnym.
- Uczestnik: token UUID v4 z maila → wymiana na krótkożyjący JWT (scope: jego event + profil). Token ważny czas eventu + miesiąc.

## Niezawodność efektów ubocznych
- **Outbox pattern**: domain event → wpis outbox w tej samej transakcji → Hangfire publikuje (maile, push). Nic nie ginie przy awarii.
- Idempotencja skanów QR: klucz `clientId` (UUID generowany na urządzeniu) → ponowny sync nie tworzy duplikatów. Konflikty: last-write-wins po timestamp + lista do przeglądu.

## Dane
- PostgreSQL, EF Core, migracje wersjonowane (expand-then-contract dla rollbacku).
- `eventId` + `TenantId` indeksowane na encjach event-scoped.
- Treści wielojęzyczne (agenda, bloki) jako jsonb `{ pl, en }`; UI przez i18next.
- Strona eventu jako jsonb (draft) + immutable snapshoty wersji przy publikacji.

## Frontend
React + Vite + TS (strict), TanStack Query, Zustand, Tailwind + shadcn/ui, i18next (PL/EN), PWA + IndexedDB (offline scanning), dnd-kit (page builder), SignalR client. Typy API generowane z OpenAPI — brak ręcznego rozjazdu kontraktu.

## Real-time
SignalR + Redis backplane (skalowanie poziome). Huby per event (grupa = eventId). Cel: <2 s od zdarzenia.

## Środowiska i parytet lokalny
| Zależność | Prod (OVH) | Lokalnie |
|---|---|---|
| DB | Managed PostgreSQL | kontener postgres |
| Cache/backplane/Hangfire | Managed Redis | kontener redis |
| Obiekty | Object Storage (S3) | MinIO |
| E-mail | Mailgun API | Mailhog (SMTP) |
| AI | Claude API | stub `IAiAssistant` |

Integracje za interfejsami (`IFileStorage`, `IEmailSender`, `IPushSender`, `IAiAssistant`) z implementacją wybieraną po konfiguracji. `docker compose up` = pełna platforma lokalnie.

## Bezpieczeństwo
HTTPS, CORS tylko zaufane domeny, rate limiting, ORM (anty-SQLi), sanityzacja user-content. **customCSS w blokach włączony** → sanityzacja server-side (usuń `expression`/`behavior`/`javascript:`/`@import`/`url()` poza whitelistą) + scoping per blok (`#block-{uuid}`) + testy XSS w CI. Audit log wpięty w pipeline MediatR na UPDATE/DELETE klienta.

## Zakres
MVP-Core: Identity+tenancy, Events, Participants(import+QR), maile+token login+RODO+preferencje, Agenda+propagacja, Page Builder (podzbiór bloków), Scanning offline, Dashboard live, Raport PDF.
Extended (po launchu): logistyka, quizy/konkursy/networking, galeria (consent-based), feedback, AI assistant, pełny audit UI.
