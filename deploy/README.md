# EventPulse — wdrożenie na VPS (multi‑app, multi‑domena, 3 repliki)

Ten katalog zawiera komplet do uruchomienia EventPulse i innych aplikacji za jednym reverse proxy.

```
                    ┌─ events.twojadomena.pl ─ Caddy LB → ep-api1 + ep-api2 + ep-api3
Internet ─► Caddy ──┤        (3 repliki; wspólne: Postgres · Redis(backplane) · MinIO)
 :80/:443 (TLS)     ├─ app2.innadomena.pl ─► własny stack (osobna aplikacja)
                    └─ app3.kolejna.pl    ─► własny stack
```

**Dlaczego 3 repliki działają:** SignalR (dashboard/quiz na żywo) ma **backplane Redis**, więc komunikaty docierają między replikami. Skanowanie jest idempotentne i offline‑safe. Migracje bazy uruchamia **tylko `ep-api1`** (pozostałe startują dopiero, gdy jest „healthy") — brak wyścigu.

Pliki:
- `docker-compose.proxy.yml` + `Caddyfile` + `proxy.env.example` — wspólny reverse proxy (raz na serwer).
- `eventpulse/docker-compose.prod.yml` + `eventpulse/.env.example` — stack EventPulse (3 repliki).

### Konkretna konfiguracja (eventpulse.pl)
| | |
|---|---|
| Serwer | OVH VPS‑2 — 4 vCPU / 8 GB RAM / 75 GB NVMe (wystarczy z zapasem) |
| Użytkownik | `ubuntu` (sudo) |
| IP | `213.186.33.5` |
| Domena | `eventpulse.pl` + `www.eventpulse.pl` — rekordy **A → 213.186.33.5 już ustawione** ✔ |
| `proxy.env` | `EVENTPULSE_DOMAIN=eventpulse.pl www.eventpulse.pl` |

DNS jest gotowy, więc Caddy od razu wystawi TLS. E‑mail (Mailgun) jest **opcjonalny** — można wdrożyć teraz i dodać później.

---

## 0) Czego potrzebuję od Ciebie, żeby to odpalić
- **Dostęp przez klucz SSH** (nie hasło): użytkownik z `sudo`, mój klucz publiczny w `~/.ssh/authorized_keys`.
- **Domeny** z rekordami **A** wskazującymi na IP serwera (EventPulse + ew. inne apki).
- **VPS:** Docker + Docker Compose v2 (zainstaluję, jeśli trzeba). Rozsądne minimum dla 3 replik + baza: ~2 vCPU / 4 GB RAM.
- Dane do maila produkcyjnego (Mailgun/SMTP) — żeby działały zaproszenia.

> Uwaga: jeśli moje środowisko nie „dosięgnie" Twojego VPS po sieci, dam Ci **gotowy skrypt do wklejenia** — efekt ten sam.

---

## 1) Przygotowanie serwera (jednorazowo)
```bash
# jako root / sudo
adduser deploy && usermod -aG sudo deploy
# dodaj mój/Twój klucz publiczny:
mkdir -p /home/deploy/.ssh && nano /home/deploy/.ssh/authorized_keys   # wklej klucz
chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys

# Docker + compose
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

# zapora: tylko SSH + HTTP(S)
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

# wspólna sieć dla proxy i aplikacji
docker network create edge
```
Zalecane: wyłącz logowanie hasłem w `/etc/ssh/sshd_config` (`PasswordAuthentication no`) → `systemctl restart ssh`.

## 2) DNS
W panelu domeny ustaw rekordy **A** na IP serwera, np. `events.twojadomena.pl → 1.2.3.4`. Poczekaj na propagację (zwykle minuty).

## 3) Reverse proxy (raz)
```bash
git clone <repo> eventpulse && cd eventpulse/deploy
cp proxy.env.example proxy.env && nano proxy.env       # EVENTPULSE_DOMAIN, ACME_EMAIL
docker compose -f docker-compose.proxy.yml --env-file proxy.env up -d
```
Caddy sam wystawi certyfikat TLS dla domeny (gdy DNS już celuje na serwer).

## 4) EventPulse (3 repliki)
```bash
cd eventpulse/deploy/eventpulse
cp .env.example .env && nano .env     # hasła DB/MinIO, Jwt__SigningKey, Cors/App URL, Mailgun, Bootstrap admin
# wygeneruj sekrety: openssl rand -base64 48
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps      # ep-api1 healthy, potem api2/api3
```
Na pierwszym starcie `ep-api1` zakłada bazę i **pierwsze konto super‑admina** z `Bootstrap__AdminEmail/Password`.

## 5) Weryfikacja
- `https://events.twojadomena.pl` → strona/logowanie (TLS zielony).
- Zaloguj się danymi z `Bootstrap__*`. Po pierwszym logowaniu możesz dodać kolejnych adminów/klientów w **Zespół** (a zmienne Bootstrap są już ignorowane).
- `https://events.twojadomena.pl/api/health` → `{"status":"healthy"}`.

---

## Skalowanie
Domyślnie 3 repliki (`ep-api1/2/3`). Aby zmienić liczbę: dodaj/usuń usługę `ep-apiN` w `docker-compose.prod.yml` (kopiuj wzór api2/api3 z `depends_on: ep-api1`) i dopisz ją w `Caddyfile` w `reverse_proxy`. Baza/Redis/MinIO pozostają wspólne.

## Dodanie kolejnej, OSOBNEJ aplikacji + domeny
1. Postaw jej stack (własny `docker-compose`), a kontenery dołącz do sieci `edge` (`networks: [edge]`), z unikalnymi nazwami (np. `app2-web`, `app2-api`).
2. W `deploy/Caddyfile` dodaj blok (jest zakomentowany przykład):
   ```
   app2.innadomena.pl {
       reverse_proxy app2-web:80
   }
   ```
3. Przeładuj proxy: `docker compose -f docker-compose.proxy.yml --env-file proxy.env up -d` (Caddy pobierze nowy certyfikat).

## Aktualizacja EventPulse
```bash
cd eventpulse && git pull
cd deploy/eventpulse
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d   # migracje zrobi ep-api1, reszta wejdzie po nim
```

## Backup
```bash
# baza
docker exec eventpulse-ep-postgres-1 pg_dump -U eventpulse eventpulse > backup_$(date +%F).sql
# pliki (MinIO) — kopiuj wolumen miniodata lub użyj mc mirror do zewnętrznego S3
```

## Bezpieczeństwo (wbudowane)
- Sekrety tylko w `.env` (ignorowane przez git) — generowane na serwerze.
- Izolacja danych między agencjami (multi‑tenant), hasła szyfrowane nieodwracalnie.
- Rate‑limiting logowania, nagłówki bezpieczeństwa (HSTS/TLS kończy Caddy).
- Baza/Redis/MinIO są tylko w sieci `internal` — niedostępne publicznie; na świat wystawiony jest wyłącznie Caddy.
