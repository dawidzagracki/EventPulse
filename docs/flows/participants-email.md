# Przepływy — Uczestnicy (§2.3) i Maile (§2.4)

UI: `frontend/src/features/participants/ParticipantsTab.tsx`
API: `backend/src/EventPulse.Api/Controllers/ParticipantsController.cs`
Testy: `ParticipantsEndpointsTests.cs`, `UnitTests/ExcelParticipantParserTests.cs`

## PE-1 — Import z Excel/CSV
1. „Pokaż import" → FileButton (.xlsx) → Podgląd / Importuj.
2. POST `/api/events/{id}/participants/import` (commit=false → preview).
3. Walidacja: nagłówki, e-mail, duplikaty; raport błędów per wiersz bez commitu.
4. Commit → uczestnicy zapisani, statystyki (totalRows/valid/imported).
- ✅ Test: `ParticipantsEndpointsTests.Import_commit_then_list_and_qr`, `Import_preview_reports_errors_without_committing`
- ✅ Unit: `ExcelParticipantParserTests.Parses_valid_rows`, `Reports_row_errors_for_missing_and_invalid_email`, `Rejects_file_with_wrong_headers`

## PE-2 — Szablon importu
1. „Pobierz szablon" → GET `/api/events/{id}/participants/template` (.xlsx).
- ✅ Test: `Template_download_returns_xlsx`

## PE-3 — Ręczne dodanie / edycja
1. „Dodaj ręcznie" → formularz imię/nazwisko/e-mail → POST `/api/events/{id}/participants`.
- ✅ Test: `Import_commit_then_list_and_qr` (lista po dodaniu), pokrycie endpointu POST.

## PE-4 — Generowanie kodu QR uczestnika (auto, UUID)
1. Każdy uczestnik dostaje `AccessToken` (UUID) przy utworzeniu.
2. GET `/api/events/{id}/participants/{pid}/qr` → PNG (QRCoder, link `/{token}`).
- ✅ Test: `Import_commit_then_list_and_qr` (pobranie QR PNG)

## PE-5 — Statusy uczestnika
Invited → Activated → Confirmed / Declined → CheckedIn → CheckedOut / NoShow.
1. POST `/api/events/{id}/participants/{pid}/status`.
- ✅ Test: `ParticipantsEndpointsTests.Status_transition_enforced`

## PE-6 — Filtrowanie / wyszukiwanie
1. UI: search (imię/e-mail/firma) + chipy statusu z licznikami.
- 🟡 Filtrowanie po stronie klienta (lista z API); brak osobnego testu UI (zakres unit/integration backendu).

## PE-7 — Masowa wysyłka maili (§2.4)
1. „Wyślij zaproszenia" → POST `/api/events/{id}/participants/invitations?onlyNotInvited=`.
2. Każdy mail: link do strony + indywidualny QR + link do aplikacji uczestnika.
3. Wysyłka przez Outbox (asynchronicznie, IEmailSender → SMTP/Mailgun).
- ✅ Test: `ParticipantsEndpointsTests.Sending_invitations_dispatches_emails`
- 🟡 **Personalizacja placeholderów** (imię/nazwa/data w treści) — szablon istnieje; brak dedykowanego assert renderu placeholderów → patrz COMPLIANCE.
