# Project Handoff

Last updated: 2026-07-18 (Asia/Shanghai)

This file contains no credentials. It is the tracked starting point for a new agent or a replacement server. Detailed account and platform identifiers remain in the ignored `docs/operations/` directory and the approved password manager.

## Product

- Brand: `六脉神剑API`
- Public site: `https://www.wboke.com`
- OpenAI-compatible base URL: `https://www.wboke.com/v1`
- Registration: public, personal-email verification required, invitation code optional
- Recharge: users purchase pre-generated redemption codes from `https://pay.ldxp.cn/shop/36YZL53G` and redeem them in New API
- Routing policy: reviewed third-party channels primary, eligible official channels fallback

## Architecture

```text
Browser / Windows desktop
  -> www.wboke.com (Vercel website and route proxy)
  -> Railway New API
       -> PostgreSQL (accounts, pricing, channels, quota, redemption)
       -> Redis (cache and runtime state)
       -> private agentmail-relay:2525
            -> AgentMail HTTPS API
```

The repository also contains `deploy/docker-compose.yml` and `deploy/caddy/Caddyfile` for migration to a dedicated Hong Kong host. Railway currently runs in US West and is a trial environment.

## Repository State

- Repository: `https://github.com/china001century-manager/oneapi`
- Production branch: `main`
- Last verified web commit: `783718619ceb326009360ed78c6f6861e9f8af4a`
- Desktop RC source commit: `f19ffc9`
- Last verified Vercel deployment: `dpl_EsPc3kQETqY5FiTWqbKZwQxT7an8`
- New API image: `calciumion/new-api:v1.0.0-rc.21`
- New API `ServerAddress`: `https://www.wboke.com` (verified through `/api/status` on 2026-07-18)

Before work, run `git status --short --branch`. Preserve any later local changes and untracked source files; do not run `git clean` as a routine setup step.

## Service Deployment

### Website

```powershell
pnpm install
pnpm --filter @wboke/web check
pnpm --filter @wboke/web build
vercel --cwd apps/web --prod --project wboke-web-test --yes
```

Test the generated deployment URL before assigning the public domain. The exact New API routes in `apps/web/vercel.json` must remain before their wildcard equivalents.

### Railway

Railway deploys the New API, PostgreSQL, Redis, and the private AgentMail relay. Runtime secrets belong only in Railway variables. The relay service root is `apps/agentmail-relay`; its SMTP port must not be public.

### Dedicated Hong Kong Host

1. Provision a clean Linux host, firewall, Docker Engine, Compose, and off-host backup storage.
2. Copy `deploy/.env.example` to `deploy/.env` and fill secrets from the password manager.
3. Restore a verified PostgreSQL backup into an isolated environment first.
4. Point a temporary test hostname at the new Caddy stack and run the acceptance checks.
5. Reduce DNS TTL, switch traffic, verify TLS and application state, then retain the old environment for rollback.
6. Do not upgrade the pinned New API image during the migration.

Start the stack from `deploy/` with `docker compose up -d`.

## Verification

Code checks:

```powershell
pnpm check
pnpm test
pnpm build
cargo test --offline --manifest-path apps/desktop/src-tauri/Cargo.toml
```

Runtime smoke checks:

- `/` returns the 六脉神剑API site.
- `/api/status` returns JSON with `server_address=https://www.wboke.com`.
- `/sign-in` and `/dashboard` return the expected web applications without redirect loops.
- `/api/token/` without a session returns JSON `401`, not HTML.
- `/v1/models` without a Key returns `401`.
- A controlled user can register, receive email, sign in, create a Key, redeem a test code, and make a charged model request.

## Desktop Status

The Tauri desktop client has login, two-factor handling, password visibility, password-reset handoff, account sync, dedicated user-Key handling, tool detection, configuration backup/apply/restore, and adapters for Codex CLI, Claude Code, Gemini CLI, and tested CC Switch schema 13.

Previous checks passed TypeScript, 10 frontend tests, the frontend build, 9 Rust tests, and a Rust release EXE build. MSI packaging is still blocked by WiX `LGHT0311`: the Tauri 2.11.4 WiX template must set `Product/@Codepage` to `!(loc.TauriCodepage)`. The desktop work is not commercially releasable until packaging, signing, clean-machine installation, real-account, and real-tool end-to-end checks pass.

## Commercial Release Gates

- Rotate the user API Key previously exposed in chat.
- Complete QQ, 163, and Outlook verification/reset-email delivery acceptance.
- Configure accurate model pricing, CNY display, exchange rate, group multipliers, and recharge multipliers.
- Approve and test upstream channels, including real quota deduction and third-party-to-official fallback.
- Generate and test the CNY 1/5/10/20/50/100 redemption-code workflow.
- Enable Turnstile, request limits, administrator 2FA, and least-privilege operator accounts.
- Establish off-provider PostgreSQL backups and pass a restore drill.
- Produce a signed Windows installer and pass clean-machine install, upgrade, uninstall, and tool-configuration tests.

Until all gates pass, describe the system as a trial web deployment plus an internal unsigned desktop RC, not as commercially complete.
