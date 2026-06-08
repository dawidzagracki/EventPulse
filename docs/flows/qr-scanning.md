# Przepływy — Kody QR (§2.5), Skaner pracownika (§2.6), Offline (§6.2)

UI: `frontend/src/features/scanner/{ScannerPage,api,feedback}.tsx`, `frontend/src/lib/scanQueue.ts`
API: `backend/src/EventPulse.Api/Controllers/ScansController.cs`
Domena: `backend/src/EventPulse.Modules.Scanning/Application/BatchScanCommand.cs`, `DashboardQuery.cs`
Testy: `ScanningEndpointsTests.cs`, `SpecComplianceTests.cs`

## QR-1 — Dwa typy kodów QR
- **Uczestnika** (auto, UUID `AccessToken`) — login + check-in/out. (patrz PE-4)
- **Stanowiska/punktu** (nazwa np. „Bar", „Konkurencja 1") — `ScanKind.Station` + `stationCode`.
- ✅ `ScanKind` = CheckIn/CheckOut/Station; stationCode na każdym skanie.

## QR-2 — Onboarding operatora: wybór stanowiska
1. Wejście na `/events/{id}/scanner` → ekran wyboru stanowiska (Wejście/Bar/Sala/Konkurs/własne).
2. Zapis w localStorage (per event); każdy skan wysyła `stationCode`.
- 🟡 UI only (localStorage) — logika wysyłki pokryta przez QR-5.

## QR-3 — Skan + natychmiastowy feedback (widok pracownika §2.6)
1. Kamera (BarcodeDetector) lub wpisanie ręczne tokena.
2. Online → flush → overlay: 🟢 imię + status + stolik/dieta, 🟡 „JUŻ WSZEDŁ o HH:MM", 🔴 „NIEZNANY KOD".
3. Beep (Web Audio) + wibracja.
4. Auto check-in/out z zapisem czasu.
- ✅ Test: `ScanningEndpointsTests.Checkin_is_idempotent_and_updates_dashboard`, `Unknown_token_is_reported_not_found`
- ✅ Test (nowy): `SpecComplianceTests.Scan_result_includes_participant_name_and_reentry_flag`

## QR-4 — Lock trybu check-in/out
1. 🔒 blokuje przełącznik, by operator nie zmienił trybu przypadkiem.
- 🟡 UI only (stan komponentu).

## QR-5 — Skan stanowiska rejestrowany + na dashboardzie (§2.5, §4.1 historia skanowań)
1. Batch z `kind=Station`, `stationCode="BAR"` → ScanEvent z czasem + uczestnikiem.
2. Dashboard agreguje `Stations[]` (kod, liczba).
- ✅ Test (nowy): `SpecComplianceTests.Station_scan_is_recorded_and_appears_on_dashboard`

## QR-6 — Idempotencja + No-show
1. Re-sync tego samego `clientId` → duplikat, nie drugi check-in.
2. POST `/api/events/{id}/no-shows` oznacza nieobecnych.
- ✅ Test: `Checkin_is_idempotent_and_updates_dashboard`, `No_shows_are_marked_for_absentees`

## QR-7 — Tryb offline (§6.2)
1. Skany kolejkowane w IndexedDB (`scanQueue.ts`), nawet bez internetu.
2. Sync co 5s + przy `online` event; idempotentny batch.
3. Flush serializowany (lock) — sync w tle nie „kradnie" wyniku skanu operatora.
- ✅ Logika idempotencji pokryta `Checkin_is_idempotent...`; kolejka offline = warstwa klienta (IndexedDB), weryfikacja manualna (devtools → offline).
