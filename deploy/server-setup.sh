#!/usr/bin/env bash
# EventPulse — jednorazowy deploy na VPS (idempotentny).
# Uruchom z katalogu repo na serwerze:   bash deploy/server-setup.sh
# Wymaga: docker + docker compose, użytkownik w grupie `docker`.
set -euo pipefail

# ── Konfiguracja domeny (zmień w razie potrzeby) ──
DOMAIN="eventpulse.pl"
WWW="www.eventpulse.pl"
ACME_EMAIL="admin@eventpulse.pl"
ADMIN_EMAIL="admin@eventpulse.pl"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROXY_DIR="$ROOT/deploy"
EP_DIR="$ROOT/deploy/eventpulse"

command -v docker >/dev/null 2>&1 || { echo "❌ Docker nie znaleziony. Najpierw zainstaluj Dockera."; exit 1; }
docker network inspect edge >/dev/null 2>&1 || { echo "==> tworzę sieć 'edge'"; docker network create edge; }

# ── proxy.env (raz) ──
if [ ! -f "$PROXY_DIR/proxy.env" ]; then
  cat > "$PROXY_DIR/proxy.env" <<EOF
EVENTPULSE_DOMAIN=$DOMAIN $WWW
ACME_EMAIL=$ACME_EMAIL
EOF
  echo "==> utworzono deploy/proxy.env"
fi

# ── eventpulse/.env (sekrety generowane RAZ; przy ponownym uruchomieniu używane istniejące) ──
if [ ! -f "$EP_DIR/.env" ]; then
  PG_PW=$(openssl rand -hex 24)
  MINIO_USER="minio_$(openssl rand -hex 4)"
  MINIO_PW=$(openssl rand -hex 24)
  JWT=$(openssl rand -base64 48 | tr -d '\n')
  ADMIN_PW=$(openssl rand -hex 12)
  cat > "$EP_DIR/.env" <<EOF
# Wygenerowane automatycznie $(date -u +%FT%TZ). NIE commituj.
POSTGRES_USER=eventpulse
POSTGRES_PASSWORD=$PG_PW
POSTGRES_DB=eventpulse
ConnectionStrings__Postgres=Host=ep-postgres;Port=5432;Database=eventpulse;Username=eventpulse;Password=$PG_PW
ConnectionStrings__Redis=ep-redis:6379
Storage__Provider=S3
Storage__Endpoint=http://ep-minio:9000
Storage__AccessKey=$MINIO_USER
Storage__SecretKey=$MINIO_PW
Storage__Bucket=eventpulse
Storage__ForcePathStyle=true
Jwt__SigningKey=$JWT
Jwt__Issuer=eventpulse
Jwt__Audience=eventpulse
Cors__Origins__0=https://$DOMAIN
Cors__Origins__1=https://$WWW
App__ParticipantLinkBaseUrl=https://$DOMAIN/p
Bootstrap__AdminEmail=$ADMIN_EMAIL
Bootstrap__AdminPassword=$ADMIN_PW
Bootstrap__AdminName=Administrator
Bootstrap__TenantName=EventPulse
# E-mail jeszcze nieskonfigurowany (zaproszenia nie wyjdą, reszta działa).
# Po założeniu np. Brevo (300 maili/dzień free) wpisz:
#   Email__Provider=Smtp
#   Email__Smtp__Host=smtp-relay.brevo.com
#   Email__Smtp__Port=587
#   Email__Smtp__UseSsl=true
#   Email__Smtp__User=...      (login SMTP z Brevo)
#   Email__Smtp__Password=...  (klucz SMTP z Brevo)
#   Email__From=no-reply@$DOMAIN
#   Email__FromName=EventPulse
# …i: cd deploy/eventpulse && docker compose -f docker-compose.prod.yml up -d
Email__Provider=Smtp
EOF
  chmod 600 "$EP_DIR/.env"
  printf '%s\n' "$ADMIN_PW" > "$EP_DIR/.admin-password.txt"
  chmod 600 "$EP_DIR/.admin-password.txt"
  echo "==> utworzono deploy/eventpulse/.env (sekrety wygenerowane)"
fi

echo "==> Buduję i uruchamiam EventPulse (3 repliki + Postgres/Redis/MinIO)…"
( cd "$EP_DIR" && docker compose -f docker-compose.prod.yml build && docker compose -f docker-compose.prod.yml up -d )

echo "==> Uruchamiam reverse proxy (Caddy, automatyczny TLS)…"
( cd "$PROXY_DIR" && docker compose -f docker-compose.proxy.yml --env-file proxy.env up -d )

echo
echo "================== GOTOWE =================="
echo "URL:    https://$DOMAIN   (TLS może wstać po ~30 s)"
echo "Login:  $ADMIN_EMAIL"
echo "Hasło:  $(cat "$EP_DIR/.admin-password.txt" 2>/dev/null || echo '(ustawione wcześniej — patrz deploy/eventpulse/.admin-password.txt)')"
echo "Po zalogowaniu zmień hasło (zakładka Zespół) i usuń .admin-password.txt."
echo "Status: cd $EP_DIR && docker compose -f docker-compose.prod.yml ps"
echo "==========================================="
