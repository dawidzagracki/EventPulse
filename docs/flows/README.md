# EventPulse — mapa przepływów (flow) + pokrycie testami

Dokument mapuje **wszystkie ścieżki użytkownika** w aplikacji, w odniesieniu do
*Specyfikacji funkcjonalnej v1.0 (maj 2026)*. Każdy przepływ ma:

- **kroki** (co robi użytkownik / system),
- **warstwa API** (endpoint),
- **warstwa UI** (plik front-endu),
- **test** który go weryfikuje (lub `LUKA` jeśli brak).

## Role (wg spec, §1)

| Rola w spec | `principalType` | Wejście | Główny ekran |
|---|---|---|---|
| Administrator / Pracownik | `Agency` | `/login` (e-mail + hasło) | `/events` |
| Klient końcowy | `Client` | `/login` (e-mail + hasło) | dashboard swojego eventu |
| Gość wydarzenia | `Participant` | `/p/{token}` (kod QR = login) | `/me` |
| Operator QR | `Operator` | `/op/{token}` (link magic 24h) | `/events/{id}/scanner` |

## Pliki

> **[📘 FLOWS.md](../FLOWS.md)** — **kompletna mapa flow per-persona** (A Agency / B Client / C Participant / D Operator / E Anonim / cross-cutting). Dokument źródłowy "jak to działa".

| Plik | Zakres (sekcje spec) |
|---|---|
| [admin-events.md](admin-events.md) | §2.1 zarządzanie wydarzeniami |
| [page-builder.md](page-builder.md) | §2.2 kreator stron |
| [participants-email.md](participants-email.md) | §2.3 uczestnicy, §2.4 maile |
| [qr-scanning.md](qr-scanning.md) | §2.5 kody QR, §2.6 skaner, §6.2 offline |
| [engagement.md](engagement.md) | §2.7 konkurencje, §2.8 quizy |
| [participant-app.md](participant-app.md) | §3 widok uczestnika |
| [dashboard-reports.md](dashboard-reports.md) | §4 dashboard i raporty |
| [cross-cutting.md](cross-cutting.md) | §6 multi-tenant, bezpieczeństwo, role |
| [COMPLIANCE.md](COMPLIANCE.md) | macierz spec → status → test |

## Legenda statusu

- ✅ **Zaimplementowane i przetestowane**
- 🟡 **Zaimplementowane, częściowo lub brak dedykowanego testu**
- ❌ **Brak / niezgodne ze spec**

## Jak uruchomić testy

```powershell
docker compose up -d           # Testcontainers wymaga Dockera
cd backend
dotnet test                    # unit + architecture + integration
```

- **UnitTests** (24) i **ArchitectureTests** (4) nie wymagają Dockera.
- **IntegrationTests** (~32) startują kontener PostgreSQL przez Testcontainers.
