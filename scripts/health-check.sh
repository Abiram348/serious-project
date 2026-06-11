#!/usr/bin/env bash
# health-check.sh — Verify dev servers are serving real assets, not 404 HTML.
#
# Why this exists:
#   Next.js dev servers can return 200 OK with HTML body (a 404 page) when
#   their build manifest is corrupt. CSS/JS chunk requests silently fail and
#   the page renders with zero styles — invisible UI. curl -I alone won't
#   catch this because the status code is 200.
#
# This script:
#   1. Hits each dev server root
#   2. Extracts the CSS path the HTML actually requests
#   3. Fetches the CSS and checks the Content-Type is text/css, NOT text/html
#   4. Verifies the body actually contains CSS (starts with /* or has { )
#   5. Reports per-service status and exits non-zero if anything is broken
#
# Usage:
#   ./scripts/health-check.sh
#   ./scripts/health-check.sh --strict   # exit 1 on any warning, not just failure

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

STRICT=false
if [[ "${1:-}" == "--strict" ]]; then
  STRICT=true
fi

declare -a FAILURES=()
declare -a WARNINGS=()
declare -a PASSES=()

# ---------------------------------------------------------------------------
# check_static_asset
#   $1: service name
#   $2: base URL (e.g. http://localhost:3000)
#   $3: html body (we'll extract a CSS path from it)
# ---------------------------------------------------------------------------
check_static_asset() {
  local name="$1"
  local base="$2"
  local html="$3"

  if [[ -z "$html" ]]; then
    WARNINGS+=("$name: empty response from $base")
    return
  fi

  # Extract the first stylesheet path
  local css_path
  css_path=$(echo "$html" | grep -oE '/_next/static/css/[^"]+' | head -1 || true)

  if [[ -z "$css_path" ]]; then
    # Try Vite/other patterns
    css_path=$(echo "$html" | grep -oE 'href="[^"]+\.css[^"]*"' | head -1 | sed -E 's/href="([^"]+)"/\1/' || true)
  fi

  if [[ -z "$css_path" ]]; then
    WARNINGS+=("$name: no CSS link found in HTML (SPA or error page?)")
    return
  fi

  # Build full URL — make absolute if needed
  local css_url
  if [[ "$css_path" == http* ]]; then
    css_url="$css_path"
  else
    css_url="${base}${css_path}"
  fi

  # Fetch the CSS
  local headers body content_type status
  headers=$(curl -sI -m 5 "$css_url" 2>/dev/null || echo "FAILED")
  body=$(curl -s -m 5 "$css_url" 2>/dev/null || echo "FAILED")

  status=$(echo "$headers" | head -1 | awk '{print $2}' || echo "000")
  content_type=$(echo "$headers" | grep -i '^content-type:' | head -1 | cut -d':' -f2- | tr -d ' \r' || echo "")

  # Detect the bad state: 200 OK but text/html (a 404 page)
  if [[ "$status" == "200" ]] && echo "$content_type" | grep -qi 'text/html'; then
    FAILURES+=("$name: CSS at $css_url returned 200 text/html (likely 404 page — dev manifest broken)")
    return
  fi

  # Detect explicit 404
  if [[ "$status" == "404" ]] || [[ "$status" == "000" ]]; then
    FAILURES+=("$name: CSS at $css_url returned status=$status (asset missing — dev manifest broken)")
    return
  fi

  # Detect empty body or HTML-looking body
  if [[ -z "$body" ]] || [[ "$body" == "FAILED" ]]; then
    FAILURES+=("$name: CSS at $css_url returned empty body")
    return
  fi

  if echo "$body" | head -c 50 | grep -qi '<!doctype\|<html'; then
    FAILURES+=("$name: CSS at $css_url body starts with HTML (got 404 page instead)")
    return
  fi

  # Body should look like CSS — starts with /* or contains selectors
  if ! echo "$body" | head -c 1000 | grep -qE '/\*|^\s*[a-z\.\#:_-][^{]*\{'; then
    WARNINGS+=("$name: CSS at $css_url body doesn't look like CSS (first 1KB: $(echo "$body" | head -c 80))")
    return
  fi

  local size=${#body}
  PASSES+=("$name: $css_url served text/css, $((size / 1024)) KB ✓")
}

# ---------------------------------------------------------------------------
# Probe each service
# ---------------------------------------------------------------------------
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SwarmDev Dev Server Health Check${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Web (Next.js on 3000)
echo -e "${YELLOW}→${NC} Probing web  (http://localhost:3000)…"
WEB_HTML=$(curl -s -m 5 http://localhost:3000/ 2>/dev/null || echo "")
check_static_asset "web" "http://localhost:3000" "$WEB_HTML"

# API (Express on 3001) — we expect JSON, not HTML
echo -e "${YELLOW}→${NC} Probing api  (http://localhost:3001)…"
API_RESPONSE=$(curl -s -m 5 http://localhost:3001/health 2>/dev/null || echo "")
if [[ -n "$API_RESPONSE" ]]; then
  if echo "$API_RESPONSE" | grep -qi 'json\|status\|ok\|error'; then
    PASSES+=("api: /health responded: $(echo "$API_RESPONSE" | head -c 80) ✓")
  else
    WARNINGS+=("api: /health response unexpected: $(echo "$API_RESPONSE" | head -c 80)")
  fi
else
  WARNINGS+=("api: no response from /health (server may not be running, or no /health route)")
fi

echo ""
echo -e "${BLUE}Results:${NC}"
echo ""

if [[ ${#PASSES[@]} -gt 0 ]]; then
  for p in "${PASSES[@]}"; do
    echo -e "  ${GREEN}✓${NC} $p"
  done
fi

if [[ ${#WARNINGS[@]} -gt 0 ]]; then
  for w in "${WARNINGS[@]}"; do
    echo -e "  ${YELLOW}⚠${NC} $w"
  done
fi

if [[ ${#FAILURES[@]} -gt 0 ]]; then
  for f in "${FAILURES[@]}"; do
    echo -e "  ${RED}✗${NC} $f"
  done
fi

echo ""
if [[ ${#FAILURES[@]} -gt 0 ]]; then
  echo -e "${RED}✗ ${#FAILURES[@]} failure(s) detected.${NC}"
  echo ""
  echo "  Most likely cause: stale Next.js .next directory (dev manifest broken)."
  echo "  Fix:"
  echo "    ./scripts/safe-clean.sh      # kill servers + clear .next safely"
  echo "    pnpm dev                      # restart fresh"
  exit 1
fi

if [[ "$STRICT" == true ]] && [[ ${#WARNINGS[@]} -gt 0 ]]; then
  echo -e "${YELLOW}⚠ ${#WARNINGS[@]} warning(s). --strict mode: exiting 1.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ All checks passed.${NC}"
exit 0
