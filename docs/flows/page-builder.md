# Przepływy — Kreator stron (page builder) (spec §2.2)

UI: `frontend/src/features/content/{PageBuilderTab,EventBlocks,blockSchema,blockStyles}.tsx`
API: `backend/src/EventPulse.Api/Controllers/PageBuilderController.cs`
Testy: `tests/EventPulse.IntegrationTests/PageBuilderEndpointsTests.cs`, `UnitTests/PageContentTests.cs`

## PB-1 — Start z szablonu
1. Toolbar → wybór szablonu (gala / konferencja / integracja / premiera / blank).
2. POST `/api/events/{id}/page/template/{key}` → zwraca bloki + branding.
- 🟡 Apply-template: endpoint istnieje, UI gotowe; brak dedykowanego assert → patrz COMPLIANCE.

## PB-2 — Budowa od zera (drag & drop + inline insert)
1. Paleta pogrupowana (Bohatery/Treść/Media/Dane/Akcje/Układ).
2. Drag bloku na canvas LUB hover „+" między blokami → picker.
3. Dostępne bloki (spec wymienia: hero, opis, harmonogram, mapa, galeria, formularz, sponsorzy, licznik): hero, description, agenda, map, gallery, sponsors, countdown + premium: stats, features, testimonial, split, faq, team, video, cta, spacer.
4. Auto-scroll przy DnD blisko krawędzi.
- ✅ Test: `PageBuilderEndpointsTests.Accepts_empty_page`, `public_render` (renderowanie zapisanych bloków)

## PB-3 — Bloki dynamiczne (z konkurencji/quizów)
Spec §2.2: „bloki automatycznie generowane na podstawie konkurencji i quizów".
- 🟡 **Częściowo** — agenda/galeria/countdown są dynamiczne (dane eventu). Dedykowanego „bloku konkurencji/quizu auto-wstawianego do kreatora" brak jako osobny typ. Patrz COMPLIANCE.

## PB-4 — Edycja stylu (kolory, czcionki, tło, zdjęcia)
1. Properties → zakładka Styl: tło (kolor/gradient/obraz), padding, radius, wyrównanie, kolory.
2. Branding: kolor główny/akcent (ColorPicker), logo, **tło strony** (kolor/gradient/obraz + presety).
3. Per-blok customCSS sanityzowany serwerowo.
- ✅ Test: `PageContentTests.Keeps_safe_css`, `Sanitizes_custom_css_inside_blocks`, `Invalid_page_content_is_rejected`, `Rejects_invalid_json`, `Rejects_missing_blocks_array`

## PB-5 — Podgląd na żywo + publikacja
1. Canvas = WYSIWYG; device toggle (desktop/tablet/mobile).
2. „Zapisz wersję roboczą" → PUT `/api/events/{id}/page`.
3. „Publikuj" → POST `/api/events/{id}/page/publish` (wersjonowanie).
4. Strona publiczna: `/public/events/{id}` — liquid-glass nav (auto-anchory), scroll-reveal.
- ✅ Test: `Accepts_empty_page` (zapis), `public_render` (publiczny render z wersji)

## PB-6 — Wersje + przywracanie
1. GET `/api/events/{id}/page/versions`; POST `.../versions/{v}/restore`.
- 🟡 Endpointy + UI gotowe; brak dedykowanego assert restore → patrz COMPLIANCE.
