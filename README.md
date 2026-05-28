# EventPulse

SaaS do kompleksowego zarządzania wydarzeniami firmowymi (gale, konferencje, integracje) dla agencji eventowych i ich klientów.

**Stack:** .NET 10 (ASP.NET Core, modular monolith) · React + TypeScript (Vite) · PostgreSQL · Redis · SignalR · Hangfire · Docker.

## Architektura

Modular monolith — jeden deployowalny backend podzielony na moduły (vertical slices) z in-process domain events (MediatR). Multi-tenancy per agencja (row-level + globalny filtr EF Core). Szczegóły: [docs/](docs/).

```
backend/   .NET 10 solution (Api host + moduły + testy)
frontend/  React + Vite (apps: agency, client, participant, scanner)
docs/      dokumentacja architektury i decyzji
```

## Uruchomienie lokalne (pełny parytet z produkcją)

Wymagania: Docker, .NET 10 SDK, Node 22+.

```bash
cp .env.example .env
docker compose up --build
```

Uruchamia: PostgreSQL, Redis, MinIO (S3), Mailhog (SMTP), API, web. Wszystkie integracje chmurowe mają lokalne odpowiedniki — całość testowalna offline.

| Usługa | Lokalnie | URL |
|--------|----------|-----|
| Web (frontend) | Vite | http://localhost:5173 |
| API | ASP.NET Core | http://localhost:8080 |
| Swagger | OpenAPI UI | http://localhost:8080/swagger |
| Mailhog | podgląd maili | http://localhost:8025 |
| MinIO | konsola S3 | http://localhost:9001 |

## Środowiska

`local` (docker-compose) → `staging` (OVH) → `production` (OVH). Sekrety przez zmienne środowiskowe; `.env` nigdy nie trafia do repo.

## Testy

```bash
dotnet test                      # unit + integration (Testcontainers)
cd frontend && npm test          # frontend
```
