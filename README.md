# WBoke API Platform

Commercial, invitation-only AI API access built around an independently deployed New API instance and a small Tauri desktop companion.

## Workspace

- `apps/desktop`: Windows-first Tauri 2 desktop client.
- `apps/web`: WBoke public website. Account and billing actions hand off to New API.
- `deploy`: pinned New API, PostgreSQL, Redis, and Caddy deployment for Hong Kong.
- `docs/plans`: validated product and architecture decisions.
- `docs/operations`: user, administrator, and project handover documentation.

## Current trial deployment

- Public portal: `https://www.wboke.com` (domain cutover completed on 2026-07-15).
- New API trial origin: `https://wbokedesktop-production.up.railway.app`.
- Public website trial origin: `https://wboke-web-test.vercel.app`.
- SMTP relay: Railway private service `agentmail-relay`; it has no public SMTP endpoint.
- Source repository: `https://github.com/china001century-manager/oneapi`.

The authoritative operational record is in `docs/operations/`. Do not store passwords,
API keys, database credentials, or DNS provider tokens in Git.

## Local development

```powershell
pnpm install
pnpm dev
pnpm dev:web
```

The desktop web preview runs at `http://127.0.0.1:1420`. The public website runs at `http://127.0.0.1:1430`.

The desktop stays in explicit demo mode until `VITE_DEMO_MODE=false` and the production endpoints are configured. Website login, registration, API status, and console routes are served by New API in production through Caddy.

## Verification

```powershell
pnpm check
pnpm test
pnpm build
```

See `deploy/.env.example` before deploying. Do not commit API keys, SMTP credentials, database passwords, or New API administrator credentials.
