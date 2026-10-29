#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
NODE="$ROOT/runtime/bin/node"
if [ ! -x "$NODE" ]; then NODE=$(command -v node || true); fi
if [ -z "$NODE" ]; then printf 'Install Node.js 24 LTS, then run this launcher again.\n'; exit 1; fi
exec "$NODE" "$ROOT/server/entry.cjs" --config "$ROOT/server.config.json" "$@"
