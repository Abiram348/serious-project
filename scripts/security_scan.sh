#!/usr/bin/env bash

# scripts/security_scan.sh
# Run security scans for the repository and fail on high severity issues.

set -euo pipefail

echo "Running npm audit (high severity)..."
# npm audit may fail if vulnerabilities exist; capture exit code.
if ! pnpm audit --audit-level=high; then
  echo "npm audit reported high severity issues"
  exit 1
fi

echo "Running bandit (Python security scanner)..."
if ! bandit -r apps/orchestrator; then
  echo "Bandit reported issues"
  exit 1
fi

echo "Running semgrep (code scanning)..."
if ! semgrep --config p/default .; then
  echo "Semgrep reported issues"
  exit 1
fi

echo "All security scans passed."
