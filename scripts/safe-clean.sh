#!/usr/bin/env bash
# safe-clean.sh — Safely clean Next.js / build caches.
#
# Why this exists:
#   Running `rm -rf apps/web/.next` while the Next.js dev server is still
#   running leaves the server in a broken state. Its in-memory build manifest
#   points to files that no longer exist, so every static asset (CSS, JS
#   chunks) returns 404 and the page renders with no styles — invisible UI.
#
# This script:
#   1. Kills any dev servers (next, vite, etc.) on common ports FIRST
#   2. Removes .next, dist, .turbo, node_modules/.cache
#   3. Reports what was freed
#
# Usage:
#   ./scripts/safe-clean.sh          # clean web + api + orchestrator caches
#   ./scripts/safe-clean.sh --deep   # also wipe node_modules reinstall hints
#
# Always run this BEFORE clearing build caches manually. Never `rm -rf .next`
# while a dev server is running.

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DEEP=false
if [[ "${1:-}" == "--deep" ]]; then
  DEEP=true
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  SwarmDev Safe Clean${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Kill dev servers on common ports BEFORE touching any cache.
# ---------------------------------------------------------------------------
echo -e "${YELLOW}[1/4]${NC} Checking for running dev servers on common ports…"

PORTS_TO_CHECK=(3000 3001 8000)
KILLED_ANY=false
for port in "${PORTS_TO_CHECK[@]}"; do
  PIDS=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "    Port $port: killing PIDs $PIDS"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    KILLED_ANY=true
  fi
done

# Also kill any lingering `next dev`, `vite`, `ts-node-dev`, `uvicorn` processes
for proc in "next dev" "next-server" "vite" "ts-node-dev" "uvicorn" "nodemon"; do
  PIDS=$(pgrep -f "$proc" 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "    Process '$proc': killing PIDs $PIDS"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    KILLED_ANY=true
  fi
done

if [[ "$KILLED_ANY" == true ]]; then
  echo "    Waiting 2s for processes to release file locks…"
  sleep 2
else
  echo "    No dev servers running. Safe to proceed."
fi

# ---------------------------------------------------------------------------
# Step 2: Snapshot disk usage BEFORE for reporting.
# ---------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[2/4]${NC} Capturing disk baseline…"
BEFORE=$(df -k "$REPO_ROOT" 2>/dev/null | awk 'NR==2 {print $4}')
echo "    Free: $((BEFORE / 1024)) MB"

# ---------------------------------------------------------------------------
# Step 3: Remove build caches.
# ---------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}[3/4]${NC} Removing build caches…"

CLEANED=()
CLEAN_TARGETS=(
  "apps/web/.next"
  "apps/web/.turbo"
  "apps/api/dist"
  "apps/api/.turbo"
  "apps/orchestrator/__pycache__"
  "apps/orchestrator/.turbo"
  "packages/db/.turbo"
  "packages/shared-types/dist"
  "packages/shared-types/.turbo"
  "node_modules/.cache"
)

for target in "${CLEAN_TARGETS[@]}"; do
  if [[ -e "$target" ]]; then
    SIZE=$(du -sh "$target" 2>/dev/null | cut -f1)
    rm -rf "$target"
    CLEANED+=("$target ($SIZE)")
  fi
done

if [[ "$DEEP" == true ]]; then
  echo "    --deep: also removing .next-config-backups"
  find . -name ".next-config-backup" -type d 2>/dev/null | xargs rm -rf 2>/dev/null || true
fi

if [[ ${#CLEANED[@]} -gt 0 ]]; then
  printf "    Cleaned:\n"
  for item in "${CLEANED[@]}"; do
    printf "      • %s\n" "$item"
  done
else
  echo "    Nothing to clean (already clean)."
fi

# ---------------------------------------------------------------------------
# Step 4: Report and exit cleanly.
# ---------------------------------------------------------------------------
echo ""
AFTER=$(df -k "$REPO_ROOT" 2>/dev/null | awk 'NR==2 {print $4}')
FREED=$(( (AFTER - BEFORE) / 1024 ))
echo -e "${YELLOW}[4/4]${NC} ${GREEN}Done.${NC}"
echo "    Free now: $((AFTER / 1024)) MB (freed ~${FREED} MB)"
echo ""
echo "  Next: run \`pnpm dev\` to start fresh dev servers."
echo ""
