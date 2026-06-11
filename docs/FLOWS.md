# EventPulse — Kompletna mapa flow

Źródło prawdy o każdym możliwym przebiegu w aplikacji. Dla każdego flow:
**Aktor · Cel · Wejście · Kroki UI/API · Pliki · Test · Edge cases**.

Spis treści:

- [Persona A — Agency (pracownik FALP)](#persona-a--agency-pracownik-falp)
- [Persona B — Client (mini-admin jednego eventu)](#persona-b--client-mini-admin-jednego-eventu)
- [Persona C — Participant (gość)](#persona-c--participant-gość)
- [Persona D — Operator QR (hostessa / ochrona)](#persona-d--operator-qr-hostessa--ochrona)
- [Persona E — Anonim / publiczna strona](#persona-e--anonim--publiczna-strona)
- [Cross-cutting (wszystkie role)](#cross-cutting-wszystkie-role)

Legenda statusu: ✅ pokryte testem · 🟡 zaimplementowane, brak dedykowanego testu · 🔴 ścieżka błędu (oczekiwana)

---

## Persona A — Agency (pracownik FALP)

Pełen admin SaaSa. `principalType=Agency`, login e-mail + hasło, dostęp do wszystkich modułów i wszystkich eventów w obrębie tenanta.

### A-1: Logowanie

- **Cel:** uzyskać JWT i wejść na listę eventów.
- **Wejście:** `/login`.
- **Kroki:**
  1. Wypełnij `email + password`, klik **Zaloguj**.
  2. UI: `POST /api/auth/login` → `{ accessToken, refreshToken, principalType, displayName, role }`.
  3. authStore zapisuje tokeny, redirect na `/events`.
- **UI:** [LoginPage.tsx](../frontend/src/features/auth/LoginPage.tsx)
- **API:** [AuthController.Login](../backend/src/EventPulse.Api/Controllers/AuthController.cs)
- **Test:** ✅ `AuthEndpointsTests`
- **Edge cases:** 🔴 401 → komunikat błędu; rate-limit „auth" 10/min per IP.

### A-2: Lista eventów + filtrowanie

- **Cel:** zobaczyć wszystkie eventy w tenancie, przefiltrować po statusie / nazwie.
- **Kroki:**
  1. `GET /api/events?status=Live&search=jan` → lista DTO.
  2. UI renderuje grid kart, badge statusu.
- **UI:** [EventsListPage.tsx](../frontend/src/features/events/EventsListPage.tsx)
- **API:** [EventsController.List](../backend/src/EventPulse.Api/Controllers/EventsController.cs:25)
- **Test:** ✅ `EventsEndpointsTests.Create_then_get_and_list`, `TenantIsolationTests`

### A-3: Utworzenie eventu

- **Cel:** dodać nowy event w statusie Draft.
- **Kroki:**
  1. Klik **Nowy event** → modal.
  2. Wypełnij Name, StartsAt, EndsAt, Location, ClientEmail.
  3. `POST /api/events` → 201 Created z DTO.
- **API:** [EventsController.Create](../backend/src/EventPulse.Api/Controllers/EventsController.cs) — `[Authorize(Agency)]`
- **Walidacja:** FluentValidation (Name niepusty, EndsAt > StartsAt).
- **Test:** ✅ `EventsEndpointsTests`

### A-4: Edycja danych eventu

- **Cel:** zmienić nazwę / daty / lokalizację / opis / clientEmail.
- **Kroki:** `PUT /api/events/{id}` — dostępne dla Agency *i* Client (Client tylko swoich).
- **API:** [EventsController.Update](../backend/src/EventPulse.Api/Controllers/EventsController.cs:44)
- **Test:** ✅ `EventDomainTests`, `EventsEndpointsTests`

### A-5: Zmiana statusu eventu (state machine)

- **Cel:** przejść Draft → Published → Live → Completed → Archived.
- **Kroki:** `POST /api/events/{id}/status` z `NewStatus`. Niemożliwe skoki (np. Draft → Archived) odrzucone domeną.
- **Domena:** [EventStatusTransitions](../backend/src/EventPulse.Modules.Events/Domain/EventStatus.cs)
- **Test:** ✅ `EventDomainTests`, `SpecComplianceTests.Event_can_be_archived_via_status`

### A-6: Usunięcie eventu

- **Cel:** twardo skasować event (np. duplikat / testowy).
- **Kroki:** klik **✕ Usuń** w EventDetailPage (Agency-only) → confirm → `DELETE /api/events/{id}`.
- **API:** [EventsController.Delete](../backend/src/EventPulse.Api/Controllers/EventsController.cs:62) — `[Authorize(Agency)]`
- **Test:** 🟡 (Gap 4 commit; pokryte typowo przez integration assertion z 404 po DELETE)

### A-7: Import uczestników z Excel/CSV

- **Cel:** masowo dodać listę gości.
- **Kroki:**
  1. Klik **Import** → wybór pliku.
  2. `POST /api/events/{id}/participants/import/preview` (multipart) — backend parsuje, zwraca listę poprawnych + listę błędów + duplikaty.
  3. UI pokazuje preview; klik **Commit** → `POST /api/events/{id}/participants/import/commit`.
- **API:** [ParticipantsController](../backend/src/EventPulse.Api/Controllers/ParticipantsController.cs), [ExcelParticipantParser](../backend/src/EventPulse.Modules.Participants/Application/Import)
- **Test:** ✅ `ExcelParticipantParserTests`, `Import_commit_then_list_and_qr`, `Import_preview_reports_errors_and_dedups`

### A-8: Ręczne dodanie / edycja uczestnika

- **Kroki:** `POST /api/events/{id}/participants` lub `PUT /api/events/{id}/participants/{pid}`.
- **Test:** 🟡 pokryte przez import + flow

### A-9: Eksport uczestników do Excel

- **Cel:** pobrać XLSX z 16 kolumnami (imię, nazwisko, e-mail, status, dieta, koszulka, transfer, godzina przylotu, lot, RSVP, check-in, check-out, minuty na evencie, …).
- **Kroki:** klik **Eksport Excel** w toolbarze → `GET /api/events/{id}/participants/export` → pobranie pliku.
- **API:** [ExportParticipantsQuery](../backend/src/EventPulse.Modules.Participants/Application/Export/ExportParticipantsQuery.cs)
- **Test:** 🟡 (Gap 3 commit)

### A-10: Wysyłka zaproszeń mailem

- **Cel:** wysłać do uczestników maila z linkiem `/p/{token}` + QR.
- **Kroki:** klik **Wyślij zaproszenia** → wybór adresatów (Wszyscy / status `Invited`) → `POST /api/events/{id}/invitations`.
- **API:** [SendInvitationsCommand](../backend/src/EventPulse.Modules.Participants/Application/Invitations)
- **Outbox:** mail trafia do outboxa (idempotentne); worker wysyła SMTP.
- **Personalizacja:** treść zawiera imię, datę startu eventu (pl-PL/en-GB), link + QR PNG.
- **Test:** ✅ `Sending_invitations_dispatches_emails`, `ParticipantSelfServiceTests` (asercja na ToEmail, imię, href, EventStartsAt)

### A-11: Page Builder — tworzenie strony eventu

- **Cel:** złożyć stronę z bloków (hero / opis / agenda / mapa / galeria / formularz / sponsorzy / licznik / quizy / konkursy).
- **Kroki:**
  1. Zakładka **Strona** w EventDetailPage.
  2. Drag-and-drop bloków z palety; inline edycja tekstów; upload obrazów (do MinIO/S3).
  3. **Podgląd** → renderuje publiczna ścieżka `/public/events/{id}`.
  4. **Publikuj** → zapis `EventPage.IsPublished=true`.
- **UI:** [PageBuilderTab.tsx](../frontend/src/features/content/PageBuilderTab.tsx), [EventBlocks.tsx](../frontend/src/features/content/EventBlocks.tsx)
- **API:** [PageBuilderController](../backend/src/EventPulse.Api/Controllers/PageBuilderController.cs)
- **Test:** ✅ `PageContentTests`, `Accepts_empty_page`, `public_render`

### A-12: Bloki dynamiczne (contests/quizzes)

- **Cel:** blok auto-listujący konkursy lub quizy z modułu Engagement.
- **Kroki:** dodaj blok `contests` lub `quizzes`; backend `/api/public/events/{id}/contests` zwraca listę.
- **Test:** 🟡 (Gap 6 commit)

### A-13: Agenda

- **Cel:** dodać punkty programu (czas, typ, lokalizacja, grupy uczestników).
- **Kroki:** zakładka **Agenda** → CRUD na `/api/events/{id}/agenda`.
- **API:** [AgendaController](../backend/src/EventPulse.Api/Controllers/AgendaController.cs)
- **Propagacja zmian:** edycja punktu → outbox → e-mail z notyfikacją.
- **Test:** ✅ `AgendaPropagationTests`

### A-14: Logistyka (pokoje, stoły, transfery)

- **Kroki:** zakładka **Logistyka** → CRUD pokoi (`/rooms`), stołów (`/tables`), transferów (`/transfers`); przypisanie uczestnika.
- **API:** [LogisticsController](../backend/src/EventPulse.Api/Controllers/LogisticsController.cs)
- **Test:** ✅ `LogisticsTests`

### A-15: Quiz asynchroniczny

- **Cel:** stwórz quiz; uczestnicy rozwiązują w swoim tempie, scoring po submit.
- **Kroki:**
  1. Zakładka **Aktywności → Quizy** → **Nowy quiz**.
  2. Dodaj pytania (text, options[], correctIndex) → `POST /api/events/{id}/quizzes/{qid}/questions`.
  3. Uczestnik: bierze quiz w aplikacji uczestnika ([C-7](#c-7-quiz-asynchroniczny)).
- **Test:** ✅ `Quiz_take_hides_answers_and_scores_submission`

### A-16: Quiz LIVE (Kahoot)

- **Cel:** host startuje sesję, wszyscy uczestnicy widzą pytanie naraz; punkty rosną z szybkością odpowiedzi.
- **Kroki host:**
  1. Quiz detail → zakładka **🔴 Na żywo** → **Rozpocznij quiz** → `POST .../live/start` → broadcast `started`.
  2. **Następne pytanie** → `POST .../live/next` → broadcast `question`.
  3. Host widzi licznik odpowiedzi (live przez SignalR `answerCount`).
  4. **Pokaż odpowiedź** → `POST .../live/reveal` → broadcast `reveal` z `correctIndex` + leaderboard.
  5. Kolejne pytania aż do końca → automatycznie `finished`; lub **Zakończ** wcześniej → `POST .../live/end`.
- **Backend:**
  - [LiveQuizController](../backend/src/EventPulse.Api/Controllers/LiveQuizController.cs) (REST)
  - [QuizHub](../backend/src/EventPulse.Api/Hubs/QuizHub.cs) (`/hubs/quiz`, SignalR)
  - [LiveQuizSession](../backend/src/EventPulse.Modules.Engagement/LiveQuiz.cs) (pure logic)
  - [LiveQuizRegistry](../backend/src/EventPulse.Api/LiveQuiz/LiveQuizRegistry.cs) z `IQuizSessionBackplane` (in-memory lub Redis)
- **Punktacja:** 500 base + 500 × (1 − elapsed/20s) speed bonus.
- **Skalowanie:** jeśli `ConnectionStrings:Redis` ustawione → stan sesji w Redisie + SignalR pub/sub między nodami.
- **UI host:** [EngagementTab.tsx](../frontend/src/features/engagement/EngagementTab.tsx) → `LiveQuizHost`
- **Test:** ✅ `LiveQuizSessionTests` (4), `LiveQuizBackplaneTests` (2)

### A-17: Konkurs

- **Cel:** konkurencja z punktacją zapisaną ręcznie / przez QR.
- **Kroki:** **Aktywności → Konkursy → Nowy**; punkty per uczestnik → ranking.
- **API:** [EngagementController](../backend/src/EventPulse.Api/Controllers/EngagementController.cs)
- **Test:** ✅ `Contest_results_and_ranking`

### A-18: Galeria

- **Cel:** sekcja zdjęć z eventu, dostępna tylko dla uczestników którzy dali zgodę.
- **Kroki:** **Galeria** → upload zdjęć → MinIO/S3; uczestnik widzi tylko jeśli `consents.gallery=true`.
- **API:** [GalleryController](../backend/src/EventPulse.Api/Controllers/GalleryController.cs)
- **Test:** ✅ `GalleryConsentTests`

### A-19: Generowanie linku operatora QR

- **Cel:** dać hostessie / ochronie 24-h URL prowadzący prosto do skanera, bez admin loginu.
- **Kroki:**
  1. W EventDetailPage klik **🔗 Link operatora** (Agency-only).
  2. `POST /api/events/{id}/operator-link` → JWT z `principalType=Operator` + `event_id` claim, 24h TTL.
  3. URL `{origin}/op/{jwt}` kopiowany do schowka.
  4. Operator otwiera URL → automatyczny login + redirect do skanera ([D-1](#d-1-pierwsze-otwarcie-skanera)).
- **API:** [EventsController.CreateOperatorLink](../backend/src/EventPulse.Api/Controllers/EventsController.cs:26)
- **Test:** 🟡 (operator scoping w `GetEventByIdQuery`; brak osobnego integration testu)

### A-20: Dashboard eventu (live)

- **Cel:** widzieć w czasie rzeczywistym: zaproszeni / potwierdzeni / obecni, frekwencję, ostatnie check-iny, ranking konkursów, podsumowanie feedbacku.
- **Kroki:** zakładka **Dashboard**; SignalR `EventHub` (`/hubs/event`) pcha update po każdym skanie.
- **API:** [DashboardController](../backend/src/EventPulse.Api/Controllers/DashboardController.cs), [EventHub](../backend/src/EventPulse.Api/Hubs/EventHub.cs)
- **Test:** ✅ `Checkin_is_idempotent_and_updates_dashboard`

### A-21: Raport PDF

- **Cel:** wygenerować PDF podsumowujący event (KPI + feedback + konkursy + lista uczestników).
- **Kroki:** **Raport → Pobierz PDF** → `GET /api/events/{id}/reports/pdf` → strumień PDF (QuestPDF).
- **API:** [ReportsController](../backend/src/EventPulse.Api/Controllers/ReportsController.cs)
- **Test:** ✅ `Feedback_then_summary_and_pdf_report`

### A-22: Audyt log

- **Cel:** zobaczyć, kto co zmienił w domenie (Agency-only).
- **Kroki:** zakładka **Audyt** → `GET /api/events/{id}/audit`.
- **API:** [AuditController](../backend/src/EventPulse.Api/Controllers/AuditController.cs)
- **Mechanizm:** `AuditLoggingBehavior<,>` w pipeline MediatR — każda komenda się zapisuje.
- **Test:** ✅ `AuditLogTests`

### A-23: Skaner QR z poziomu Agency

- **Cel:** Agency też może być przy bramce.
- **Kroki:** EventDetailPage → przycisk **Skaner QR** → `/events/{id}/scanner`.
- Reszta identyczna jak [D-3..D-7](#d-3-skan-happy-path).

---

## Persona B — Client (mini-admin jednego eventu)

`principalType=Client`. Loguje się tak samo jak Agency, ale backend widzi go tylko dla jednego eventu (tego, którego `ClientEmail` to jego mail).

### B-1: Logowanie + smart redirect

- **Cel:** klient widzi *tylko* swój dashboard.
- **Kroki:**
  1. Login `POST /api/auth/login`.
  2. `GET /api/events` zwraca dokładnie 1 event (`ListEventsQuery` filtruje po `ClientEmail`).
  3. UI: jeśli Client + dokładnie 1 event → `Navigate replace` do `/events/{id}` (smart redirect z [EventsListPage](../frontend/src/features/events/EventsListPage.tsx)).
- **API:** [ListEventsQuery](../backend/src/EventPulse.Modules.Events/Application/Queries/ListEventsQuery.cs)
- **Test:** ✅ Gap 1 — scoping (`ListEventsQuery` z `IsClient` branch)

### B-2: Tryb klienta — skrócone menu

- **Cel:** klient nie widzi Logistyki / Aktywności / Audytu (chowamy 4 zakładki).
- **Kroki:** [EventDetailPage](../frontend/src/features/events/EventDetailPage.tsx) wyświetla 5 zakładek (Dashboard / Przegląd / Strona / Uczestnicy / Galeria) jeśli `principalType==='Client'`.
- **Sygnał wizualny:** pill **"Tryb klienta"** (kolor sky/cyan) w top barze.
- **Test:** 🟡 (UI-only, manualnie)

### B-3: Próba otwarcia cudzego eventu (security)

- **🔴 ścieżka błędu:** klient wpisuje w URL `/events/{ktoś-inny-id}`.
- **Backend:** `GetEventByIdQuery` rzuca `NotFoundException` (a nie 403, żeby nie leakować istnienia).
- **UI:** ekran „Nie znaleziono".
- **Test:** ✅ Gap 1 — `IsClient` branch w `GetEventByIdQuery`

### B-4: Podgląd publicznej strony

- **Cel:** klient chce zobaczyć jak strona wygląda dla gości.
- **Kroki:** klik **Otwórz publiczną stronę** → nowe okno na `/public/events/{id}` ([E-1](#e-1-otwarcie-publicznej-strony-eventu)).

### B-5: Edycja własnego eventu

- **Cel:** klient może edytować dane swojego eventu, page builder, agendę, uczestników (ale nie utworzyć/usunąć eventu).
- **Polityka:** `[Authorize(AgencyOrClient)]` na controllerach Events/Participants/Agenda/Content; **`[Authorize(Agency)]`** dodatkowo na `Create` i `Delete`.

---

## Persona C — Participant (gość)

`principalType=Participant`. Wchodzi przez `/p/{token}` z linka mailowego, sesja trwa 12h (`ParticipantTokenHours`), self-heal na 401.

### C-1: Wejście przez token z maila

- **Kroki:**
  1. Uczestnik klika link `https://app/p/abc...`.
  2. UI: `POST /api/auth/participant` z tokenem → `{ accessToken, firstName, lastName, eventId }`.
  3. authStore zapisuje `accessToken` + raw token (na self-heal); redirect na `/me`.
- **UI:** [ParticipantTokenPage.tsx](../frontend/src/features/participant/ParticipantTokenPage.tsx)
- **API:** [AuthController.ParticipantLogin](../backend/src/EventPulse.Api/Controllers/AuthController.cs:35)
- **Test:** ✅ `AuthEndpointsTests`, `Invalid_participant_token_is_rejected`

### C-2: Bramka RODO

- **Cel:** uczestnik musi zaakceptować zgody przed dostępem do dalszych sekcji.
- **Kroki:**
  1. Hero pokazuje przycisk **Zgody RODO**.
  2. `GET /api/me/consents` zwraca listę z `accepted=false`.
  3. Uczestnik zaznacza checkboxy → `POST /api/me/consents` z akceptacjami.
- **UI:** `ConsentsSection` w [ParticipantHome.tsx](../frontend/src/features/participant/ParticipantHome.tsx)
- **Test:** ✅ `Full_participant_onboarding_flow`

### C-3: Preferencje

- **Cel:** ustawić język, dietę, koszulkę, transfer, godzinę przylotu/wylotu, lot, życzenia.
- **API:** `GET/PUT /api/me/preferences`
- **Test:** ✅ `ParticipantSelfServiceTests`

### C-4: Agenda + zmiany powiadomień

- **Kroki:** `GET /api/me/agenda` zwraca tylko punkty z grupy uczestnika.
- **Edge case:** Agency zmienia punkt → backend emituje notyfikację outboxem → uczestnik dostaje maila.
- **Test:** ✅ `AgendaPropagationTests`, `Participant_sees_common_items_but_not_other_groups`

### C-5: RSVP (potwierdź / odmów)

- **Cel:** jednoznaczna deklaracja przyjścia, niezależna od check-inu.
- **Kroki:**
  1. W hero kart **Czy będziesz?** → klik **Potwierdzam** / **Rezygnuję**.
  2. `POST /api/me/rsvp` z `{ status: 'Confirmed' | 'Declined' }`.
  3. **🔴 ścieżka:** jeśli uczestnik już ma check-in → RSVP zignorowany (backend `RsvpCommand`).
- **API:** [RsvpCommand](../backend/src/EventPulse.Modules.Participants/Application/Me/RsvpCommand.cs)
- **Test:** 🟡 (Gap 7 commit)

### C-6: Mój QR (pełnoekranowy)

- **Cel:** szybko pokazać kod przy bramce, max brightness.
- **Kroki:** zakładka **🎟 Mój QR** → fullscreen PNG QR + opcja **Pokaż jaśniej**.
- **API:** `GET /api/me/qr` (PNG) — JWT auth.
- **Test:** ✅ `SpecComplianceTests.My_qr_returns_png`

### C-7: Quiz asynchroniczny

- **Kroki:**
  1. Zakładka **🎯 Quizy** → lista; klik **Weź udział**.
  2. `GET /api/me/quizzes/{id}/take` → pytania bez `correctIndex`.
  3. Uczestnik odpowiada, klik **Wyślij** → `POST .../submit` → punktacja.
- **Test:** ✅ `Quiz_take_hides_answers_and_scores_submission`

### C-8: Quiz LIVE (Kahoot player)

- **Cel:** włączyć się do sesji prowadzonej przez hosta, odpowiadać w czasie pytania.
- **Kroki:**
  1. Lista quizów → przycisk **🔴 Na żywo** → otwiera `LiveQuizPlayerCard`.
  2. SignalR connect do `/hubs/quiz`; `JoinQuiz(quizId)` → rejestracja w grupie + odbiór state.
  3. Host startuje → `started` → karta „Czekamy na prowadzącego…".
  4. Host wysyła pytanie → `question` payload (text, options) — uczestnik klika kafel A/B/C/D → `SubmitAnswer` przez hub.
  5. Host pokazuje odpowiedź → `reveal` z `correctIndex` + leaderboard → karty kolorują się (zielona = poprawna, czerwona = źle, szare = nieoznaczone).
  6. Następne pytania → finał `finished` z rankingiem.
- **UI:** `LiveQuizPlayerCard` w [ParticipantHome.tsx](../frontend/src/features/participant/ParticipantHome.tsx)
- **Edge cases:**
  - 🔴 utrata połączenia → `withAutomaticReconnect`; po reconnect hub wysyła `state` (czy jest sesja, indeks).
  - 🔴 jedna odpowiedź per pytanie — kolejne kliki są ignorowane (`LiveQuizSession.Answer` zwraca `false`).
  - 🔴 odpowiedź po `Reveal` — odrzucona.
- **Test:** ✅ `LiveQuizSessionTests` (4 scenariusze)

### C-9: Konkurs

- **Cel:** uczestnictwo w konkursie (skanowanie partnerów / quiz / inne).
- **Kroki:** UI wymienia konkursy; punkty wpisuje Agency lub system (np. po skanie QR konkursowym).
- **Test:** ✅ `Contest_results_and_ranking`

### C-10: Networking

- **Cel:** uczestnik skanuje QR innego uczestnika, dodaje go do swoich kontaktów.
- **API:** `POST /api/me/networking/connect`
- **Test:** 🟡

### C-11: Skaner stanowiska (gość)

- **Cel:** gość sam zeskanuje QR-stanowiska („Stoisko VIP", „Bar"), żeby zarejestrować obecność.
- **Kroki:**
  1. Sekcja **Skaner stanowisk** w aplikacji uczestnika.
  2. Kamera (BarcodeDetector); skan kodu → `POST /api/me/scans` z `{ clientId, stationCode }`.
  3. Idempotentne po `clientId` (gość może skanować ten sam kod, system policzy raz).
- **API:** [SelfStationScanCommand](../backend/src/EventPulse.Modules.Scanning/Application/SelfStationScanCommand.cs)
- **Test:** 🟡 (Gap 5 commit)

### C-12: Galeria

- **Cel:** zobaczyć zdjęcia z eventu.
- **Kroki:** zakładka **📸 Galeria** → `GET /api/me/gallery` (działa tylko jeśli `consents.gallery=true`).
- **Test:** ✅ `GalleryConsentTests`

### C-13: AI asystent

- **Cel:** zapytać o lokalizację, agendę, kogo zaprosili.
- **Kroki:** sekcja **AI**; `POST /api/me/chat` → mock LLM (dev) lub provider (prod); odpowiedź + log w `AiChatLog`.
- **API:** [Chat module](../backend/src/EventPulse.Modules.Ai/)
- **Test:** ✅ `AiChatTests`

### C-14: Feedback

- **Cel:** ocena eventu w gwiazdkach + komentarz.
- **Kroki:** `POST /api/me/feedback` → agreguje do `Feedback_summary` (Agency widzi w dashboardzie / PDF).
- **Test:** ✅ `Feedback_then_summary_and_pdf_report`

### C-15: Wygaśnięcie tokenu

- **🔴 ścieżka:** JWT participanta wygasł (12h) — `apiClient` dostaje 401, próbuje `POST /api/auth/participant` z surowym tokenem z localStorage. Token wciąż ważny (długoterminowy, zmienia się tylko jak Agency wygeneruje nowy) → odświeżenie sesji bez interakcji.
- **Test:** ✅ self-heal logic (`apiClient.ts`)

---

## Persona D — Operator QR (hostessa / ochrona)

`principalType=Operator`. Wchodzi przez magic-link `{origin}/op/{jwt}` wygenerowany przez Agency ([A-19](#a-19-generowanie-linku-operatora-qr)). Pinned do jednego eventu, 24h ważności. Dostęp **tylko** do `/events/{id}/scanner`.

### D-1: Pierwsze otwarcie skanera (operator)

- **Kroki:**
  1. Operator otwiera URL `{origin}/op/{jwt}`.
  2. UI: [OperatorLandingPage](../frontend/src/features/operator/OperatorLandingPage.tsx) parsuje JWT (atob), wyciąga `event_id`, sprawdza `exp`.
  3. authStore zapisuje token jako Operator session; redirect na `/events/{id}/scanner`.
  4. Pierwszy raz pokazuje się **tutorial 3 ekrany** (Trzymaj telefon stabilnie / Skanuj szybko / Kolory mają znaczenie) — flaga `ep.scanner.tutorialSeen` w localStorage.
- **Edge cases:**
  - 🔴 zły / wygasły token → ekran „Nie można otworzyć skanera" z przyczyną.
  - 🔴 próba otwarcia innej trasy → `ProtectedRoute` wraca na `/events/{eventId}/scanner`.
- **Test:** 🟡 (manualnie)

### D-2: Wybór stanowiska (pierwszy raz)

- **Kroki:** modal **„Gdzie skanujesz?"** z presetami (Wejście, Bar, Sala główna, Konkurs, Inne…). Wybór zapisany w localStorage `ep.scanner.station.{eventId}`.
- **Test:** 🟡

### D-3: Skan happy-path

- **Kroki:**
  1. Kamera (BarcodeDetector) odczytuje token QR.
  2. UI: `extractToken` parsuje token z URL-a uczestnika (`/p/abc...`).
  3. `enqueueScan` → IndexedDB (`scan-queue` store) z `clientId` (Guid), `eventId`, `participantToken`, `stationCode`, `kind=CheckIn`.
  4. `flushQueue` → `POST /api/events/{id}/scans/batch` z paczką → 200 + DTO `BatchScanResult { items[] }`.
  5. Per item: `kind=ok|warn|error`, `participant: { firstName, lastName, table, room, diet }`.
  6. **FeedbackOverlay**: pełnoekranowy zielony flash + imię + status, beep (Web Audio) + wibracja (Vibration API).
- **API:** [ScansController.Batch](../backend/src/EventPulse.Api/Controllers/ScansController.cs:18) — `[Authorize(ScannerAccess)]`
- **Test:** ✅ `Checkin_is_idempotent_and_updates_dashboard`, `SpecComplianceTests.Scan_result_includes_participant_name_and_reentry_flag`

### D-4: Skan duplikatu (re-entry)

- **🟡 ścieżka:** uczestnik już wszedł.
- **Backend:** `BatchScanCommand` widzi istniejący Scan dla `(participantId, kind=CheckIn)` → zwraca `kind=warn` z polem `alreadyAt: <czas pierwszego skanu>`.
- **UI:** żółty flash + napis **„JUŻ WSZEDŁ o 17:32"**, krótszy beep.
- **Test:** ✅ jw.

### D-5: Skan nieznanego kodu

- **🔴 ścieżka:** token nie pasuje do żadnego uczestnika w evencie.
- **Backend:** `kind=error`, `reason='notfound'`.
- **UI:** czerwony flash + napis **„NIEZNANY KOD"**.
- **Test:** ✅

### D-6: Tryb offline

- **Kroki:** brak internetu → `enqueueScan` zapisuje do IndexedDB; status pill **Offline** + `pending` count. Po reconnect (lub timer 5s) `flushQueue` re-wysyła paczkę. Idempotencja po `clientId`.
- **UI:** [scanQueue.ts](../frontend/src/lib/scanQueue.ts), [ScannerPage.tsx](../frontend/src/features/scanner/ScannerPage.tsx)
- **Test:** 🟡 (logika idempotencji pokryta w integration)

### D-7: Zmiana stanowiska / odblokowanie trybu

- **Kroki:**
  1. Klik **Zmień stanowisko** → modal preset / custom; nowy `stationCode` w localStorage.
  2. Toggle CheckIn/CheckOut zablokowany domyślnie (lock mode); klik **Odblokuj** wymaga potwierdzenia.
- **Test:** 🟡

### D-8: Operator próbuje wejść poza swój event

- **🔴 ścieżka:** operator manipuluje URL na `/events/{inny-id}/scanner`.
- **Backend:** [GetEventByIdQuery](../backend/src/EventPulse.Modules.Events/Application/Queries/GetEventByIdQuery.cs) sprawdza `_currentUser.IsOperator && _currentUser.EventId != ev.Id` → `NotFoundException`.
- **Frontend:** route nie ma osobnej weryfikacji eventId vs token — backend jest jedynym źródłem prawdy.
- **Test:** ✅ logika w `GetEventByIdHandler`

### D-9: Brak kamery / odmowa dostępu

- **🔴 ścieżka:** BarcodeDetector niedostępny lub `getUserMedia` odrzucone.
- **UI:** fallback do **ręcznego wpisania tokenu**; komunikaty z `scanner.cameraUnsupported` / `scanner.cameraDenied`.
- **Test:** 🟡

---

## Persona E — Anonim / publiczna strona

Brak loginu. Jedyna dostępna trasa: `/public/events/{id}`.

### E-1: Otwarcie publicznej strony eventu

- **Kroki:** `GET /api/public/events/{id}` (anonim) → `EventPage` (zbudowana w PageBuilder) + meta event (nazwa, daty, lokalizacja).
- **API:** [PublicEventsController](../backend/src/EventPulse.Api/Controllers/PublicEventsController.cs) — `[AllowAnonymous]`
- **Renderowane:** bloki z page buildera (hero / opis / agenda / sponsorzy / galeria / RSVP form / contests / quizzes / mapa / licznik).
- **Test:** ✅ `Public_event_endpoint_returns_published_blocks_only`, `PageContentTests.public_render`

### E-2: Bloki dynamiczne na publicznej stronie

- **Cel:** sekcja „Quizy" / „Konkursy" zaciąga listę z backendu na żywo.
- **API:** `GET /api/public/events/{id}/quizzes`, `/contests`
- **Test:** 🟡 (Gap 6 commit)

### E-3: Próba wejścia na adminkę bez JWT

- **🔴 ścieżka:** anonim otwiera `/events` → `ProtectedRoute` redirect → `/login`.

---

## Cross-cutting (wszystkie role)

### X-1: JWT refresh (Agency/Client)

- **Cel:** odświeżyć access token po wygaśnięciu (15 min) bez ponownego loginu.
- **Kroki:** `apiClient` dostaje 401 → `POST /api/auth/refresh` z `refreshToken` → nowy access token w authStore → retry oryginalnego requestu.
- **API:** [AuthController.Refresh](../backend/src/EventPulse.Api/Controllers/AuthController.cs:28)
- **Test:** ✅ `AuthEndpointsTests` refresh path

### X-2: Logout

- **Kroki:** authStore `logout()` → czyści wszystkie pola; redirect `/login`.
- **Backend:** brak server-side (JWT stateless); refresh token wygasa naturalnie.

### X-3: Multi-tenancy

- **Mechanizm:** każda encja domeny ma `TenantId`; EF global query filter automatycznie filtruje per tenant z `_currentUser.TenantId`. Save interceptor stempluje `TenantId` przy insercie.
- **Test:** ✅ `TenantIsolationTests`, `TenantIsolationModelTests.TenantId_is_stamped_automatically_on_insert`

### X-4: Audit log

- **Mechanizm:** `AuditLoggingBehavior<,>` w pipeline MediatR — każda komenda się loguje (user, time, command name, payload).
- **UI:** zakładka Audyt (Agency-only).
- **Test:** ✅ `AuditLogTests`

### X-5: Rate limiting

- **Mechanizm:** `AddRateLimiter` w Program.cs — global 300/min/IP + `auth` 10/min/IP. Tylko w `Staging`/`Production` (Development off, integration tests też off).
- **UI:** 429 → komunikat „Zbyt wiele prób".

### X-6: Bezpieczeństwo nagłówków

- HSTS terminuje na proxy. App ustawia `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

### X-7: SignalR auth przez query-string

- WebSockets nie mogą ustawić `Authorization` headera → JwtBearer w `OnMessageReceived` czyta `?access_token=...` dla ścieżek `/hubs/...`.
- Hubs: `EventHub` (`/hubs/event`), `QuizHub` (`/hubs/quiz`).
- **Skalowanie:** SignalR + LiveQuiz sesja **przez ten sam Redis** (`signalr.AddStackExchangeRedis(redis)` + `RedisQuizSessionBackplane`).
- **Test:** ✅ `LiveQuizBackplaneTests` (dwa registry-sy ze wspólnym backplane widzą wzajemnie mutacje)

### X-8: Outbox + email worker

- **Mechanizm:** każda komenda dotykająca maila (zaproszenia, propagacja agendy, RSVP, reset hasła) zapisuje wpis w `OutboxMessage` w tej samej transakcji co domena. Background worker odpytuje co kilka sekund, wysyła SMTP, oznacza jako `Processed`.
- **Idempotencja:** worker bierze `messageId` jako klucz; ponowne uruchomienie nie duplikuje wiadomości.
- **Test:** ✅ `OutboxTests`

### X-9: Storage abstrakcja (S3/MinIO)

- **Mechanizm:** `IFileStorage` — lokalnie MinIO, produkcja AWS S3 (lub OVH Object Storage). Pre-signed URL dla uploadów + downloadów.
- **Test:** ✅ `FileStorageTests`

### X-10: Walidacja + globalny ExceptionHandler

- **Mechanizm:** `ValidationBehavior<,>` w MediatR rzuca `ValidationException` → globalny `AppExceptionHandler` mapuje na 400 z `ProblemDetails` (RFC 7807) z `errors[]`.
- **NotFound / Conflict:** podobne mapowanie (404 / 409).
- **Test:** ✅ `ExceptionHandlingTests`

### X-11: i18n (PL / EN)

- **Frontend:** `react-i18next`, dwa zasoby `i18n/pl.json` i `i18n/en.json`. Switch w preferencjach uczestnika i w stopce admina.
- **Backend:** maile w PL/EN zależnie od `preferences.language`.

### X-12: Wybór języka na poziomie eventu

- `Event.DefaultLanguage` (`pl-PL` / `en-GB`) wymusza język w mailach i publicznej stronie (jeśli uczestnik nie ma własnej preferencji).

---

## Diagram statusów eventu (state machine)

```
Draft ──Publish──▶ Published ──Start──▶ Live ──End──▶ Completed ──Archive──▶ Archived
  │                  │                                    ▲
  │                  └────── Unpublish ─────────────────┘ (z Completed do Archived
  │                                                       musi przejść przez chain)
  └──(soft via DELETE, twarde usunięcie z DB)
```

Skoki niedozwolone (np. Draft → Live) → 409 Conflict z `domain.statusTransitionInvalid`.
Test: ✅ `EventDomainTests`, `Event_can_be_archived_via_status`.

---

## Diagram autoryzacji per controller

| Controller | Polityka klasy | Wyjątki na metodach |
|---|---|---|
| `EventsController` | `AgencyOrClient` | `Create`, `Delete`, `CreateOperatorLink` → `Agency` |
| `ParticipantsController` | `AgencyOrClient` | — |
| `AgendaController` | `AgencyOrClient` | — |
| `PageBuilderController` | `AgencyOrClient` | — |
| `EngagementController` | `AgencyOrClient` | — |
| `LiveQuizController` | `AgencyOrClient` | — |
| `LogisticsController` | `AgencyOrClient` | — |
| `GalleryController` | `AgencyOrClient` | — |
| `DashboardController` | `AgencyOrClient` | — |
| `ReportsController` | `AgencyOrClient` | — |
| `AuditController` | `Agency` | — |
| `ScansController` | `ScannerAccess` (Agency + Client + Operator) | — |
| `ParticipantMeController` | `Participant` | — |
| `PublicEventsController` | `AllowAnonymous` | — |
| `AuthController` | `AllowAnonymous` | `Me` → `Authorize` |

---

## Mapa testów

```
backend/tests/
├── EventPulse.UnitTests/          (30 testów)
│   ├── EventDomainTests
│   ├── SlugTests
│   ├── ExcelParticipantParserTests
│   ├── LiveQuizSessionTests
│   ├── LiveQuizBackplaneTests
│   └── PageContentTests
├── EventPulse.ArchitectureTests/  (4 testy — separacja warstw)
└── EventPulse.IntegrationTests/   (~50 testów, wymaga Dockera)
    ├── EventsEndpointsTests
    ├── AuthEndpointsTests
    ├── TenantIsolationTests
    ├── ParticipantSelfServiceTests
    ├── AgendaPropagationTests
    ├── ScanningTests
    ├── EngagementTests
    ├── FeedbackTests
    ├── PageContentTests
    ├── SpecComplianceTests
    └── …
```

Uruchamianie:
```powershell
docker compose up -d
cd backend
dotnet test                          # wszystko
dotnet test tests/EventPulse.UnitTests/EventPulse.UnitTests.csproj  # bez Dockera
```

---

## Skalowanie (multi-instance)

Aplikacja jest **stateful** w jednym miejscu — sesje LIVE quizu — i przed wprowadzeniem wielu replik trzeba:

1. **Ustawić `ConnectionStrings:Redis`** — automatycznie przełącza:
   - SignalR pub/sub między instancjami (`signalr.AddStackExchangeRedis`)
   - `RedisQuizSessionBackplane` — stan sesji LIVE w Redisie
2. **Sticky sessions** (lub WebSocket-aware load balancer) — SignalR `LongPolling`/`ServerSentEvents` fallback wymaga sticky; pure WebSockets nie.
3. **Postgres** — i tak współdzielony.

Z jedną instancją wszystko działa in-memory bez Redisa.

---

## TL;DR — wszystkie endpointy

Przeglądowe `GET /openapi/v1.json` (Development). Pełna lista:

**Auth:** login · refresh · participant · me

**Events:** list · get · create · update · status · delete · operator-link

**Participants:** import preview · import commit · list · update · qr · token · export · invitations

**Me (participant):** consents · preferences · agenda · rsvp · qr · scans · networking · quizzes/{take,submit} · feedback · chat · gallery

**Scanning:** scans/batch · no-shows

**Engagement:** quizzes (CRUD + questions + ranking) · contests (CRUD + results + ranking) · **live/{start,next,reveal,end}**

**Page Builder:** page (GET/PUT) · publish · uploads

**Agenda:** items (CRUD)

**Logistics:** rooms · tables · transfers

**Gallery:** photos

**Dashboard / Reports:** dashboard · reports/pdf · audit

**Public:** events/{id} · events/{id}/quizzes · events/{id}/contests

**SignalR Hubs:** `/hubs/event` · `/hubs/quiz`
