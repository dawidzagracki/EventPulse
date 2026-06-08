# Przepływy — Dashboard i raporty (spec §4)

UI: `frontend/src/features/dashboard/DashboardTab.tsx`, `features/audit/AuditTab.tsx`
API: `DashboardController.cs`, `ReportsController.cs`, `FeedbackController.cs`, `AuditController.cs`
Testy: `PostEventTests.cs`, `ScanningEndpointsTests.cs`

## DR-1 — Dashboard wydarzenia (§4.1)
1. GET `/api/events/{id}/dashboard`.
2. Statystyki: zaproszeni, potwierdzeni, obecni, **frekwencja %**.
3. KPI ring + funnel (Invited→Confirmed→CheckedIn→CheckedOut) + aktywność stanowisk + feed wejść.
4. Live update przez SignalR (`dashboardChanged`).
- ✅ Test: `ScanningEndpointsTests.Checkin_is_idempotent_and_updates_dashboard` (checkedIn, total, attendancePct)
- ✅ Test (nowy): `SpecComplianceTests.Station_scan_is_recorded_and_appears_on_dashboard` (historia/aktywność stanowisk)

## DR-2 — Lista uczestników z czasami check-in/out
1. Dashboard recent check-ins + statusy; czasy `CheckedInAt`/`CheckedOutAt`.
- ✅ Pokryte: check-in zapisuje czas (`Checkin_is_idempotent...`); recent w `DashboardQuery`.

## DR-3 — Historia skanowań QR (kto / stanowisko / kiedy)
- ✅ ScanEvent przechowuje ParticipantId + StationCode + OccurredAt; agregacja stacji w dashboard (DR-1 nowy test).

## DR-4 — Ranking konkurencji + wyniki quizów na dashboardzie
- ✅ Rankingi: `EngagementTests.Contest_results_and_ranking`, `Quiz_take_hides_answers_and_scores_submission`.

## DR-5 — Feedback (oceny) + podsumowanie
1. Uczestnik: gwiazdki + komentarz → POST `/api/me/feedback`.
2. Pracownik: GET `/api/events/{id}/feedback` (średnia, rozkład).
- ✅ Test: `PostEventTests.Feedback_then_summary_and_pdf_report`

## DR-6 — Raport PDF (§4.2)
1. GET `/api/events/{id}/report` → PDF (podsumowanie, frekwencja, aktywność, quizy).
- ✅ Test: `PostEventTests.Feedback_then_summary_and_pdf_report` (generuje PDF)

## DR-7 — Eksport danych do Excel (§5.3)
Spec: „eksportuje dane uczestników i odpowiedzi do Excel".
- ❌ **LUKA** — brak endpointu eksportu uczestników/odpowiedzi do XLSX (jest tylko import + szablon). Patrz COMPLIANCE.

## DR-8 — Dostęp klienta końcowego do dashboardu (§4, §1)
1. Klient (`Client`) loguje się → skrócone menu, welcome stripe; redirect gdy ma 1 event (UI).
- ❌ **LUKA**: brak server-side scopingu listy po `clientEmail` — patrz COMPLIANCE „Priorytetowe luki #1".

## DR-9 — Audyt (log akcji administratora)
1. GET `/api/audit` — kto, akcja, kiedy, payload.
- 🟡 Endpoint + UI gotowe; bez dedykowanego assert (audit pisany przez `AuditLoggingBehavior`). Patrz COMPLIANCE.
