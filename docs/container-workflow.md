# Container Workflow

Use Docker as the local execution boundary for package installs, tests, builds, and the dev server.

## Commands

Open a shell:

```txt
scripts/container-shell.sh
```

Run one command:

```txt
scripts/container-run.sh npm run check
```

The helper scripts source `.env.local` before invoking Docker Compose. Keep credentials in `.env.local`; do not move secrets into compose files, docs, or tracked source.

Start the app:

```txt
docker compose run -d --service-ports --name codex_project-dev app npm run dev
```

Stop it:

```txt
docker stop codex_project-dev
```

## Boundaries

Allowed:

- npm installs and local tooling
- tests, browser smoke, and builds
- local files, migrations, and scripts in this repo
- Codex CLI auth mount for local recording use

Not allowed without a separate decision:

- committed secrets
- real payment credentials
- real reminder sends to non-allowlisted targets
- VPS provisioning
- broad host filesystem mounts

`.env.local` is ignored by Git. Keep API keys, Supabase credentials, and Codex auth out of checked-in files.
