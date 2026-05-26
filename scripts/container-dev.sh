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

docker rm -f codex_project-dev >/dev/null 2>&1 || true
docker compose run -d --service-ports --name codex_project-dev app npm run dev
