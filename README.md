# 六脉神剑API

Commercial AI API access built around an independently deployed New API instance, a public website, and a Windows Tauri companion. Registration uses personal-email verification; invitation codes are optional.

## Workspace

- `apps/desktop`: Windows-first Tauri 2 desktop client.
- `apps/web`: WBoke public website. Account and billing actions hand off to New API.
- `deploy`: pinned New API, PostgreSQL, Redis, and Caddy deployment for Hong Kong.
- `docs`: current architecture, handoff instructions, and validated design decisions.

## Current deployment

- Public portal and OpenAI-compatible API: `https://www.wboke.com` and `https://www.wboke.com/v1`.
- New API trial origin: `https://wbokedesktop-production.up.railway.app`.
- Public website project: `wboke-web-test` on Vercel.
- SMTP relay: Railway private service `agentmail-relay`; it has no public SMTP endpoint.
- Source repository: `https://github.com/china001century-manager/oneapi`.

The current Railway deployment is a trial environment, not the final Hong Kong production host. See `docs/HANDOFF.md` for the current release identifiers, migration procedure, and unresolved production gates.

Do not store passwords, API keys, database credentials, or DNS provider tokens in Git.

## Local development

```powershell
pnpm install
pnpm dev
pnpm dev:web
```

The desktop web preview runs at `http://127.0.0.1:1420`. The public website runs at `http://127.0.0.1:1430`.

The desktop release-candidate configuration uses `VITE_DEMO_MODE=false` and the formal domain. Website login, registration, API status, and console routes are served by New API through Vercel rewrites in the trial environment and through Caddy after migration to a dedicated host.

## Verification

```powershell
pnpm check
pnpm test
pnpm build
```

See `deploy/.env.example` before deploying. Do not commit API keys, SMTP credentials, database passwords, or New API administrator credentials.

## Documentation

- `docs/README.md`: documentation index and lifecycle rules.
- `docs/HANDOFF.md`: sanitized handoff for a new agent or server.
- `AGENTS.md`: repository operating rules.
- `docs/operations/`: local-only account and production records; intentionally ignored by Git.
