#!/bin/bash
set -e

echo "=== Build: frontend ==="
cd "$(dirname "$0")/artifacts/whatsapp-dashboard"
BASE_PATH=/ PORT=3000 pnpm run build

echo "=== Build: API server ==="
cd "$(dirname "$0")/artifacts/api-server"
pnpm run build

echo "=== Starting server on port ${PORT:-80} ==="
cd "$(dirname "$0")/artifacts/api-server"
PORT=${PORT:-80} node --enable-source-maps ./dist/index.mjs
