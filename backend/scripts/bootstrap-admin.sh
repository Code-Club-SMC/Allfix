#!/usr/bin/env bash
# =============================================================================
# bootstrap-admin.sh — Create or check the Allfix admin account
#
# Commands:
#   status   Check whether an admin has been created
#   create   Create the first admin account
#
# Usage (run from the backend/ directory):
#   ./scripts/bootstrap-admin.sh status
#   ./scripts/bootstrap-admin.sh create
# =============================================================================
set -euo pipefail

# ─── Locate backend/ directory (works regardless of where you run the script) ─
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# ─── Preserve command-line env vars before sourcing .env files ────────────────
# Command-line env vars take precedence over .env file values
SAVED_BASE_URL_LOCAL="${BASE_URL_LOCAL:-}"
SAVED_BOOTSTRAP_SECRET_LOCAL="${BOOTSTRAP_SECRET_LOCAL:-}"
SAVED_ADMIN_BOOTSTRAP_SECRET="${ADMIN_BOOTSTRAP_SECRET:-}"
SAVED_ADMIN_NAME="${ADMIN_NAME:-}"
SAVED_ADMIN_EMAIL="${ADMIN_EMAIL:-}"
SAVED_ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

# ─── Load .env files from backend/ ────────────────────────────────────────────
[[ -f "${BACKEND_DIR}/.env" ]]             && source "${BACKEND_DIR}/.env"             2>/dev/null || true
[[ -f "${BACKEND_DIR}/.env.development" ]] && source "${BACKEND_DIR}/.env.development" 2>/dev/null || true

# ─── Restore command-line env vars (override .env values) ─────────────────────
[[ -n "$SAVED_BASE_URL_LOCAL" ]]         && BASE_URL_LOCAL="$SAVED_BASE_URL_LOCAL"
[[ -n "$SAVED_BOOTSTRAP_SECRET_LOCAL" ]] && BOOTSTRAP_SECRET_LOCAL="$SAVED_BOOTSTRAP_SECRET_LOCAL"
[[ -n "$SAVED_ADMIN_BOOTSTRAP_SECRET" ]] && ADMIN_BOOTSTRAP_SECRET="$SAVED_ADMIN_BOOTSTRAP_SECRET"
[[ -n "$SAVED_ADMIN_NAME" ]]             && ADMIN_NAME="$SAVED_ADMIN_NAME"
[[ -n "$SAVED_ADMIN_EMAIL" ]]            && ADMIN_EMAIL="$SAVED_ADMIN_EMAIL"
[[ -n "$SAVED_ADMIN_PASSWORD" ]]         && ADMIN_PASSWORD="$SAVED_ADMIN_PASSWORD"

# ─── Defaults ─────────────────────────────────────────────────────────────────
BASE_URL="${BASE_URL_LOCAL:-http://localhost:8000}"
BOOTSTRAP_SECRET="${BOOTSTRAP_SECRET_LOCAL:-${ADMIN_BOOTSTRAP_SECRET:-}}"
ENDPOINT="${BASE_URL}/api/internal/bootstrap-admin"

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'
info()    { echo -e "${CYAN}ℹ  ${RESET}$*"; }
success() { echo -e "${GREEN}✔  ${RESET}$*"; }
warn()    { echo -e "${YELLOW}⚠  ${RESET}$*"; }
die()     { echo -e "${RED}✖  ${RESET}$*" >&2; exit 1; }

# ─── Dependency check ─────────────────────────────────────────────────────────
command -v curl >/dev/null 2>&1 || die "curl is required but not installed."
command -v jq   >/dev/null 2>&1 || die "jq is required but not installed."

[[ -n "$BOOTSTRAP_SECRET" ]] || die "BOOTSTRAP_SECRET / ADMIN_BOOTSTRAP_SECRET is not set. Check your .env.development file."

COMMAND="${1:-}"

# ─── status ───────────────────────────────────────────────────────────────────
cmd_status() {
  info "Checking admin status → ${ENDPOINT}"

  local body http_code
  http_code=$(curl -s -o /tmp/cb_bootstrap_body.json -w "%{http_code}" \
    -H "x-bootstrap-secret: ${BOOTSTRAP_SECRET}" \
    "${ENDPOINT}")
  body=$(cat /tmp/cb_bootstrap_body.json)

  case "$http_code" in
    200)
      local bootstrapped count
      bootstrapped=$(echo "$body" | jq -r '.bootstrapped')
      count=$(echo "$body" | jq -r '.superAdminCount')
      if [[ "$bootstrapped" == "true" ]]; then
        success "Admin exists — ${count} admin account(s) found."
      else
        warn "No admin account yet. Run:  ./scripts/bootstrap-admin.sh create"
      fi
      ;;
    404) die "HTTP 404 — wrong bootstrap secret or server not running at ${BASE_URL}" ;;
    *)   die "Unexpected HTTP ${http_code}: ${body}" ;;
  esac
}

# ─── create ───────────────────────────────────────────────────────────────────
cmd_create() {
  info "Creating admin account → ${ENDPOINT}"

  # Use env vars if set, otherwise prompt interactively
  local name="${ADMIN_NAME:-}"
  local email="${ADMIN_EMAIL:-}"
  local password="${ADMIN_PASSWORD:-}"

  if [[ -z "$name" ]]; then
    echo -ne "${BOLD}Full name:${RESET} "; read -r name
  fi
  if [[ -z "$email" ]]; then
    echo -ne "${BOLD}Email:${RESET} "; read -r email
  fi
  if [[ -z "$password" ]]; then
    echo -ne "${BOLD}Password (min 8 chars):${RESET} "; read -rs password; echo
  fi

  [[ -n "$name" ]]     || die "Name cannot be empty."
  [[ -n "$email" ]]    || die "Email cannot be empty."
  [[ ${#password} -ge 8 ]] || die "Password must be at least 8 characters."

  local payload
  payload=$(jq -n \
    --arg name     "$name" \
    --arg email    "$email" \
    --arg password "$password" \
    '{name: $name, email: $email, password: $password}')

  local body http_code
  http_code=$(curl -s -o /tmp/cb_bootstrap_body.json -w "%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-bootstrap-secret: ${BOOTSTRAP_SECRET}" \
    -d "$payload" \
    "${ENDPOINT}")
  body=$(cat /tmp/cb_bootstrap_body.json)

  case "$http_code" in
    200)
      local uid
      uid=$(echo "$body" | jq -r '.userId')
      success "Admin account created!"
      info    "  Name    : ${name}"
      info    "  Email   : ${email}"
      info    "  User ID : ${uid}"
      info ""
      info "You can now sign in at your frontend /admin/login page"
      ;;
    409) warn "An admin already exists. Use 'update' if you need to change credentials." ;;
    400) die "Validation error: $(echo "$body" | jq -r '.error // empty' || echo "$body")" ;;
    404) die "HTTP 404 — wrong bootstrap secret or server not running at ${BASE_URL}" ;;
    500) die "Server error: $(echo "$body" | jq -r '.error // empty' || echo "$body")" ;;
    *)   die "Unexpected HTTP ${http_code}: ${body}" ;;
  esac
}

# ─── Entry point ──────────────────────────────────────────────────────────────
info "Target: ${BOLD}${BASE_URL}${RESET}"

case "$COMMAND" in
  status) cmd_status ;;
  create) cmd_create ;;
  *)
    echo -e "${BOLD}Usage:${RESET}"
    echo "  ./scripts/bootstrap-admin.sh status   — check if admin exists"
    echo "  ./scripts/bootstrap-admin.sh create   — create the first admin"
    echo ""
    echo -e "${BOLD}Non-interactive (env vars):${RESET}"
    echo "  ADMIN_NAME='Your Name' ADMIN_EMAIL='you@example.com' ADMIN_PASSWORD='pass1234' \\"
    echo "    ./scripts/bootstrap-admin.sh create"
    ;;
esac
