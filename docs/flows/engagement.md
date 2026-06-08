# Przepływy — Konkurencje (§2.7) i Quizy (§2.8)

UI: `frontend/src/features/engagement/EngagementTab.tsx`, `frontend/src/features/participant/ParticipantHome.tsx`
API: `backend/src/EventPulse.Api/Controllers/EngagementController.cs`
Testy: `tests/EventPulse.IntegrationTests/EngagementTests.cs`

## EN-1 — Tworzenie konkurencji
1. Zakładka Aktywności → „Nowy konkurs" → nazwa + tryb (Punkty / Czas).
2. POST `/api/events/{id}/contests`.
- ✅ Test: `EngagementTests.Contest_results_and_ranking`

## EN-2 — Konkurencja na czas (Start → zadanie → skan = Stop) (§2.7, §3.2)
Spec: uczestnik klika Start, wykonuje zadanie, skan QR kończy pomiar czasu.
- 🟡 **Częściowo** — backend liczy wynik/ranking konkurencji; mechanika „Start w aplikacji uczestnika → skan kończący czas" nie jest osobnym, w pełni zsynchronizowanym flow w UI uczestnika. Ranking i wynik działają. Patrz COMPLIANCE.

## EN-3 — Ranking konkurencji (auto, widoczny u uczestnika i na dashboardzie)
1. GET `/api/events/{id}/contests/{cid}/ranking`.
- ✅ Test: `Contest_results_and_ranking`

## EN-4 — Blok konkurencji w kreatorze (auto)
Spec §2.7: „po utworzeniu automatycznie pojawia się blok w kreatorze stron".
- 🟡 patrz `page-builder.md` PB-3 (bloki dynamiczne) — COMPLIANCE.

## EN-5 — Tworzenie quizu + pytania
1. „Nowy quiz" → tytuł → repeater pytań (treść + odpowiedzi A/B/C, oznaczenie poprawnej literką-przyciskiem).
2. POST `/api/events/{id}/quizzes`, POST `.../quizzes/{qid}/questions`.
- ✅ Test: `EngagementTests.Quiz_take_hides_answers_and_scores_submission` (pośrednio tworzy quiz+pytania)

## EN-6 — Rozwiązanie quizu przez uczestnika
1. Uczestnik: zakładka Aktywności → quiz → odpowiedzi → wyślij.
2. GET `/api/me/quizzes/{qid}` (bez ujawniania poprawnych), POST `.../submit` (scoring).
3. Wynik: poprawność (+ czas reakcji wg spec).
- ✅ Test: `Quiz_take_hides_answers_and_scores_submission`

## EN-7 — Tryb „Kahoot na żywo" (§2.8)
Spec: „administrator startuje quiz → wszyscy widzą pytanie jednocześnie; ranking na żywo po każdym pytaniu".
- ❌ **LUKA** — obecnie quiz jest **asynchroniczny** (uczestnik rozwiązuje we własnym tempie). Brak host-controlled live sync (jedno pytanie naraz dla wszystkich, ranking po pytaniu). Patrz COMPLIANCE (rekomendacja: SignalR „QuizHub").

## EN-8 — Networking (dodawanie kontaktów)
1. Uczestnik dodaje kontakt po tokenie/QR (wymaga zgody networking).
- ✅ Test: `EngagementTests.Networking_requires_consent_and_lists_contact`
