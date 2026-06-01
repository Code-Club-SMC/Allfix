#!/usr/bin/env bash
# Usage:
#   ./scripts/migrate.sh up          Apply all pending migrations
#   ./scripts/migrate.sh down        Roll back last migration
#   ./scripts/migrate.sh down N      Roll back N migrations
#   ./scripts/migrate.sh version     Show current version
#   ./scripts/migrate.sh --env prod up

set -euo pipefail

[[ -f ".env" ]] && source .env
[[ -f ".env.development" ]] && source .env.development 2>/dev/null || true

ENV_NAME=""
COMMAND=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env|-e) ENV_NAME="$2"; shift 2 ;;
    *) COMMAND="$*"; break ;;
  esac
done

if [[ -n "$ENV_NAME" ]]; then
  UPPER=$(echo "$ENV_NAME" | tr '[:lower:]' '[:upper:]')
  URL_VAR="DATABASE_URL_${UPPER}"
  if [[ -n "${!URL_VAR:-}" ]]; then
    DATABASE_URL="${!URL_VAR}"
  fi
fi

: "${DATABASE_URL:?DATABASE_URL is required}"

migrate -path ./migrations -database "$DATABASE_URL" $COMMAND
