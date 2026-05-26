#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env.local ]]; then
  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${key//[[:space:]]/}" ]] && continue
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    export "$key=$value"
  done < .env.local
fi

docker compose run --rm app "$@"
