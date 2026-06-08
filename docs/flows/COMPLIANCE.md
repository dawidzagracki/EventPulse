# Macierz zgodności ze Specyfikacją funkcjonalną v1.0

Status: ✅ zaimplementowane i przetestowane · 🟡 zaimplementowane / częściowe / bez dedykowanego testu · ❌ brak / niezgodne.

## §2.1 Zarządzanie wydarzeniami
| Wymaganie | Status | Test / uwaga |
|---|---|---|
| Tworzenie (nazwa, data, godzina, lokalizacja, opis) | ✅ | `EventsEndpointsTests.Create_then_get_and_list` |
| Unikalny URL/slug podstrony | ✅ | tamże (slug) |
| Edycja | ✅ | `useUpdateEvent` + PUT; domena `EventDomainTests` |
| Archiwizacja | ✅ | `SpecComplianceTests.Event_can_be_archived_via_status` (nowy) |
| **Usunięcie** | ❌ | brak `HttpDelete`. Rekom.: dodać soft-delete lub jawny DELETE |
| Dashboard z listą wszystkich wydarzeń + statusy | ✅ | `Create_then_get_and_list`, izolacja w `TenantIsolationTests` |

## §2.2 Kreator stron
| Wymaganie | Status | Test / uwaga |
|---|---|---|
| Gotowe szablony | 🟡 | endpoint `template/{key}` + UI; brak assert |
| Budowa od zera, drag & drop | ✅ | `Accepts_empty_page`, `public_render` |
| Bloki: hero/opis/harmonogram/mapa/galeria/formularz/sponsorzy/licznik | ✅ | wszystkie + premium; render: `public_render` |
| **Bloki dynamiczne z konkurencji/quizów** | 🟡 | agenda/galeria/countdown dynamiczne; auto-blok konkurencji/quizu — brak |
| Edycja kolorów/czcionek/logo/tła/zdjęć | ✅ | `PageContentTests` (CSS sanityzacja), branding UI |
| Podgląd na żywo + publikacja + wersje | ✅/🟡 | `Accepts_empty_page`, `public_render`; restore bez assert |

## §2.3 Uczestnicy
| Wymaganie | Status | Test |
|---|---|---|
| Import Excel/CSV (+preview/walidacja/duplikaty) | ✅ | `Import_commit_then_list_and_qr`, `Import_preview_reports_errors...`, `ExcelParticipantParserTests` |
| Ręczne dodawanie/edycja | ✅ | POST participants (pokryte w imporcie/list) |
| Auto QR per uczestnik (UUID) | ✅ | `Import_commit_then_list_and_qr` (QR PNG) |
| Statusy (zaproszony→…→check-out) | ✅ | `Status_transition_enforced` |
| Filtrowanie/wyszukiwanie | 🟡 | UI client-side; bez testu UI |

## §2.4 Maile
| Wymaganie | Status | Test |
|---|---|---|
| Masowa wysyłka zaproszeń | ✅ | `Sending_invitations_dispatches_emails` |
| Mail: link + QR + link do aplikacji | ✅ | tamże (treść/payload) |
| **Personalizacja placeholderów** | 🟡 | szablon istnieje; brak assert renderu imię/nazwa/data |

## §2.5–2.6 Kody QR + Skaner pracownika
| Wymaganie | Status | Test |
|---|---|---|
| QR uczestnika (weryfikacja, check-in/out) | ✅ | `Checkin_is_idempotent_and_updates_dashboard` |
| QR stanowisk (nazwa, rejestracja z czasem) | ✅ | `SpecComplianceTests.Station_scan_is_recorded_and_appears_on_dashboard` (nowy) |
| Skaner: imię/status/„czy może wejść" po skanie | ✅ | `SpecComplianceTests.Scan_result_includes_participant_name_and_reentry_flag` (nowy) |
| Auto check-in/out z czasem | ✅ | `Checkin_is_idempotent...` |
| **Tworzenie nazwanych QR stanowisk przez pracownika (encje)** | 🟡 | stationCode to free-text przy skanie; brak panelu generowania plakatów QR stanowisk |
| Offline kolejkowanie + sync | ✅(logika)/🟡(UI) | idempotencja: `Checkin_is_idempotent...`; IndexedDB = warstwa klienta (manualnie) |

## §2.7 Konkurencje
| Wymaganie | Status | Test |
|---|---|---|
| Tworzenie (nazwa/opis/typ czas/punkty) | ✅ | `Contest_results_and_ranking` |
| **Na czas: Start w app → zadanie → skan = Stop** | 🟡 | wynik+ranking są; pełny flow Start/Stop w UI uczestnika niepełny |
| Ranking auto (uczestnik + dashboard) | ✅ | `Contest_results_and_ranking` |
| Auto-blok w kreatorze | 🟡 | patrz §2.2 |

## §2.8 Quizy (Kahoot)
| Wymaganie | Status | Test |
|---|---|---|
| Tworzenie pytań + poprawna odpowiedź | ✅ | `Quiz_take_hides_answers_and_scores_submission` |
| Punktacja (poprawność + czas) | ✅ | tamże |
| **Tryb LIVE: host startuje, wszyscy widzą pytanie naraz, ranking po każdym pytaniu** | ❌ | obecnie quiz **asynchroniczny**. Rekom.: SignalR „QuizHub" (host→broadcast pytania, live ranking) |

## §3 Widok uczestnika
| Wymaganie | Status | Test |
|---|---|---|
| Wejście przez QR/link (bez hasła) | ✅ | `AuthEndpointsTests`, `Invalid_participant_token_is_rejected` |
| Bramka RODO | ✅ | `Full_participant_onboarding_flow` |
| Strona/agenda/lokalizacja | ✅ | `Participant_sees_common_items_but_not_other_groups` |
| Mój QR (do pokazania na bramce) | ✅ | `SpecComplianceTests.My_qr_returns_png` (nowy) |
| **RSVP (potwierdź/rezygnuj jako akcja)** | 🟡 | status + zgody w onboardingu; brak osobnego przycisku RSVP |
| **Skaner QR stanowisk u gościa (kamera)** | ❌ | gość nie ma skanera kamery stanowisk. Rekom.: kamera w app uczestnika |
| Udział w quizach / rankingi | ✅ | `Quiz_take...`, `Contest_results_and_ranking` |

## §4 Dashboard i raporty
| Wymaganie | Status | Test |
|---|---|---|
| Statystyki (zaproszeni/potwierdzeni/obecni/frekwencja) | ✅ | `Checkin_is_idempotent_and_updates_dashboard` |
| Czasy check-in/out per gość | ✅ | check-in zapisuje czas; recent w `DashboardQuery` |
| Historia skanowań (kto/stanowisko/kiedy) | ✅ | `Station_scan_is_recorded_and_appears_on_dashboard` (nowy) |
| Rankingi konkurencji + wyniki quizów | ✅ | `Contest_results_and_ranking`, `Quiz_take...` |
| Feedback + podsumowanie | ✅ | `Feedback_then_summary_and_pdf_report` |
| Raport PDF | ✅ | tamże |
| **Eksport do Excel (uczestnicy/odpowiedzi)** | ❌ | brak endpointu eksportu XLSX. Rekom.: `GET /participants/export` |
| Dostęp klienta końcowego | 🟡/❌ | patrz §6 niżej (scoping klienta) |

## §6 Techniczne / bezpieczeństwo
| Wymaganie | Status | Test |
|---|---|---|
| SPA w przeglądarce, responsywność | ✅ | React+Vite; UI mobile-first |
| Kamera QR | ✅ | BarcodeDetector w skanerze |
| Offline (kolejka + sync) | ✅(logika)/🟡(UI) | jw. |
| Oddzielna autentykacja (hasło vs token) | ✅ | `AuthEndpointsTests` |
| QR UUID unikalne | ✅ | token = `Guid` |
| Multi-tenant izolacja | ✅ | `TenantIsolationTests` (4 testy) |
| Architektura modularna | ✅ | `DependencyRuleTests` |
| **Scoping klienta końcowego do JEGO wydarzeń** | ❌ | **`ListEventsQuery` nie filtruje po `clientEmail` — Klient widzi WSZYSTKIE wydarzenia tenanta i może otworzyć każde po ID.** Patrz „Priorytetowe luki". |

---

## Priorytetowe luki (rekomendacje)

1. **🔴 Scoping Klienta (bezpieczeństwo/prywatność)** — `Client` powinien widzieć i otwierać wyłącznie wydarzenia, gdzie `event.clientEmail == jego e-mail`. Dziś brak filtra → wyciek listy wydarzeń innych klientów tego samego tenanta.
   - Zakres: rozszerzyć `ICurrentUser` o e-mail; filtr w `ListEventsQuery`; guard w `GetEventByIdQuery` (403 dla obcego eventu).
2. **🟠 Quiz LIVE (Kahoot)** — host-controlled, SignalR broadcast pytań + live ranking. Dziś async.
3. **🟠 Eksport Excel** (§5.3) — endpoint XLSX uczestników + odpowiedzi.
4. **🟡 Usunięcie wydarzenia** (§2.1) — jawny DELETE lub soft-delete.
5. **🟡 Skaner stanowisk u gościa** (§3.2) — kamera w aplikacji uczestnika.
6. **🟡 Auto-bloki konkurencji/quizu w kreatorze** (§2.2).
7. **🟡 RSVP jako wyraźna akcja** (§3.2).
8. **🟡 Personalizacja maili — assert placeholderów**.

## Podsumowanie

- **Rdzeń spec (eventy, kreator, uczestnicy, QR/skaner, dashboard, raport PDF, role, multi-tenant, offline) — ✅ zaimplementowany i w większości pokryty testami.**
- **Realne braki vs spec:** scoping klienta (🔴), quiz LIVE (🟠), eksport Excel (🟠), delete eventu, skaner gościa.
- Nowy plik testów `SpecComplianceTests.cs` domyka 4 wcześniej nietestowane (ale zaimplementowane) ścieżki: station scan→dashboard, wzbogacony wynik skanu, `/api/me/qr`, archiwizacja.
