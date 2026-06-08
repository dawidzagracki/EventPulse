# Przepływy — Widok uczestnika / gościa (spec §3)

UI: `frontend/src/features/participant/{ParticipantTokenPage,ParticipantHome}.tsx`
API: `backend/src/EventPulse.Api/Controllers/ParticipantMeController.cs`
Testy: `ParticipantSelfServiceTests.cs`, `AuthEndpointsTests.cs`

## PA-1 — Wejście przez kod QR / link (§3.1)
1. Gość klika `/p/{token}` z maila (kod QR = login, bez hasła).
2. POST `/api/auth/participant` z tokenem → sesja, `principalType: Participant`.
3. Token zapamiętany (re-exchange na 401). Redirect na `/me`.
- ✅ Test: `AuthEndpointsTests` (participant token), `ParticipantSelfServiceTests.Invalid_participant_token_is_rejected`

## PA-2 — Bramka RODO (§3.1, §6.3)
1. Bez akceptacji RODO → pełnoekranowy ekran zgód (RODO wymagane, foto/networking opcjonalne).
2. POST `/api/me/consents` → odblokowuje aplikację.
- ✅ Test: `ParticipantSelfServiceTests.Full_participant_onboarding_flow` (consents w ścieżce)

## PA-3 — Aplikacja zakładkowa (mobile-first)
Bottom-nav: 📅 Agenda · 🎯 Aktywności · 🎟 Mój QR · 📸 Galeria · 👤 Profil.
1. **Agenda** — hero „Cześć", „Najbliższy punkt", „Twoje miejsce" + lista.
   - GET `/api/me/agenda` (filtr po grupie uczestnika).
   - ✅ Test: `ParticipantSelfServiceTests.Participant_sees_common_items_but_not_other_groups`
2. **Mój QR** — pełny kod wejścia + „Rozjaśnij".
   - GET `/api/me/qr` → PNG.
   - ✅ Test (nowy): `SpecComplianceTests.My_qr_returns_png`
3. **Aktywności** — quizy / networking / AI / feedback (patrz engagement.md).
4. **Galeria** — GET `/api/me/gallery` (zgoda na foto).
   - ✅ Test: `GalleryTests` (upload/list/download w kontekście eventu)
5. **Profil** — preferencje (`PUT /api/me/preferences`), logistyka, zgody.
   - ✅ Test: `Full_participant_onboarding_flow` (preferences w ścieżce)

## PA-4 — Potwierdzenie obecności / rezygnacja (RSVP §3.2)
1. Status uczestnika Confirmed/Declined.
- 🟡 Zgody + preferencje + status w onboardingu; dedykowany przycisk RSVP „potwierdzam/rezygnuję" jako osobna akcja — patrz COMPLIANCE.

## PA-5 — Skaner QR u gościa (§3.2 „skanowanie kodów stanowisk")
Spec: gość skanuje kody stanowisk własnym telefonem.
- ❌ **LUKA** — gość ma pole tokena (networking), ale brak kamery-skanera stanowisk w aplikacji uczestnika. Backend `ScanKind.Station` gotowy. Patrz COMPLIANCE.

## PA-6 — AI asystent (ponad spec)
1. POST `/api/me/ai/chat` — Q&A o evencie (kontekst agendy/profilu).
- 🟡 Funkcja dodatkowa; bez dedykowanego testu (zależy od klucza AI).
