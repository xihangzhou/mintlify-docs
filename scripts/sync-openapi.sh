#!/usr/bin/env bash
# Sync OpenAPI spec from vmeg-serv SpringDoc (group: openapi).
# Usage: ./scripts/sync-openapi.sh [BASE_URL]
# Example: ./scripts/sync-openapi.sh http://localhost:8080
#
# Writes a diff summary to api-reference/.openapi.diff.md for review / agent context.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/api-reference/openapi.json"
PREV="${ROOT}/api-reference/.openapi.prev.json"
DIFF_MD="${ROOT}/api-reference/.openapi.diff.md"
BASE_URL="${1:-http://localhost:8080}"
ENDPOINT="${BASE_URL}/v3/api-docs/openapi"

if [[ -f "${OUT}" ]]; then
  cp "${OUT}" "${PREV}"
  echo "Backed up current spec -> ${PREV}"
fi

echo "Fetching ${ENDPOINT} -> ${OUT}"
curl -fsSL "${ENDPOINT}" -o "${OUT}"

# Production only (no staging server in public docs)
node -e "
const fs = require('fs');
const p = process.argv[1];
const spec = JSON.parse(fs.readFileSync(p, 'utf8'));
spec.servers = [{ url: 'https://api.vmeg.ai', description: 'Production' }];
fs.writeFileSync(p, JSON.stringify(spec, null, 2) + '\n');
" "${OUT}"

node "${ROOT}/scripts/build-openapi-i18n.mjs" zh
node "${ROOT}/scripts/openapi-diff.mjs" > "${DIFF_MD}" 2>&1 || true

echo ""
echo "Diff summary: ${DIFF_MD}"
echo "Done. Run 'mint validate' to verify the docs site."
