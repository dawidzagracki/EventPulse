#!/usr/bin/env bash
# =============================================================================
# EventPulse — SAFE production update.
#
# Run on the VPS. It:
#   1) backs up the Postgres database (before any migration),
#   2) pulls the latest code (fast-forward only),
#   3) rebuilds ONLY the EventPulse stack — the shared Caddy proxy and any
#      co-hosted apps (e.g. your website) are NOT touched,
#   4) ep-api1 applies pending migrations exactly once, then api2/api3 + web,
#   5) waits for health and prints a rollback hint.
#
# The July-2026 change set adds only ADDITIVE columns (events.Show*Tab, default
# true) — no data is dropped or rewritten, so this is safe on the live DB.
#
# Usage:  cd <repo>/deploy/eventpulse && ./update.sh
# =============================================================================
set -euo pipefail

STACK_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="${REPO_DIR:-$(cd "$STACK_DIR/../.." && pwd)}"
COMPOSE=(docker compose -f docker-compose.prod.yml)
PG_CONTAINER="${PG_CONTAINER:-eventpulse-ep-postgres-1}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/ep-backups}"

cd "$STACK_DIR"
# Load POSTGRES_USER / POSTGRES_DB from the stack's .env.
# shellcheck disable=SC1091
set -a; . ./.env; set +a

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%F_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/eventpulse_${STAMP}.sql"

echo "▶ 1/5 Backing up database → $BACKUP_FILE"
docker exec "$PG_CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE"
echo "  ✓ backup: $(du -h "$BACKUP_FILE" | cut -f1)"

PREV="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
echo "▶ 2/5 Current commit (rollback point): $PREV"

echo "▶ 3/5 Pulling latest code (main)"
git -C "$REPO_DIR" pull --ff-only origin main

echo "▶ 4/5 Rebuilding ONLY the EventPulse stack (proxy + other apps untouched)"
"${COMPOSE[@]}" build
"${COMPOSE[@]}" up -d

echo "▶ 5/5 Waiting for ep-api1 (migrations) to become healthy…"
for _ in $(seq 1 45); do
  if "${COMPOSE[@]}" ps ep-api1 2>/dev/null | grep -q healthy; then
    echo "  ✓ ep-api1 healthy — migrations applied"
    break
  fi
  sleep 4
done

"${COMPOSE[@]}" ps
echo
echo "✅ Update complete."
echo "   DB backup : $BACKUP_FILE"
echo "   Rollback  : git -C $REPO_DIR checkout $PREV && (cd $STACK_DIR && ${COMPOSE[*]} build && ${COMPOSE[*]} up -d)"
echo "   (The added columns are harmless to old code, so a code-only rollback needs no DB restore.)"
