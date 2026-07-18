# 六脉神剑API Platform Design

## Product boundary

六脉神剑API is a commercial API service intended for operation by a Hong Kong company. Users register publicly with a personal-email verification code; an invitation code is optional. They buy prepaid redemption codes from the company's approved Lianxiaopu storefront and redeem them on `www.wboke.com`.

New API remains the account, token, quota, model-pricing, channel-routing, usage-log, and redemption data source. WBoke does not fork its relay core. The desktop app is a companion for account visibility and safe developer-tool configuration; it is not a chat client, local proxy, or payment processor.

## Fixed origins

- Account, registration, recharge, redemption: `https://www.wboke.com`
- OpenAI-compatible gateway: `https://www.wboke.com/v1`
- Planned desktop updates: `https://www.wboke.com/downloads/desktop`

The desktop app does not accept arbitrary API origins. External links are restricted to HTTPS pages under `wboke.com` and the approved Lianxiaopu storefront.

## Commercial model

Initial denominations are CNY 1, 5, 10, 20, 50, and 100. Redemption codes are pre-generated in small batches and uploaded to Lianxiaopu. The storefront payment result is not trusted by WBoke; the one-time redemption code is the handoff boundary.

User balance is displayed in CNY. The account unit remains stable while model prices and the default group multiplier are adjustable. New API's default `QuotaPerUnit` remains unchanged. Price changes apply only to new requests and usage logs retain the effective pricing snapshot.

All five supplier families use dual sourcing: OpenAI, Anthropic, Gemini, DeepSeek, and GLM. An approved third-party channel is primary and an eligible official channel is fallback. A fallback is allowed only when the resulting cost still meets the configured minimum margin. Unsupported or unverified official channels remain disabled; region restrictions must not be bypassed.

## Desktop experience

The desktop app provides:

1. Account login and explicit demo/development state.
2. Balance, endpoint, masked API key, recent usage, and synchronization status.
3. A curated model list with input/output prices and availability.
4. Tool detection and configuration previews for Codex CLI, Claude Code, and Gemini CLI.
5. Browser handoff to the official recharge and account pages.
6. Configuration backup and rollback before any adapter writes a third-party tool file.

Tool adapters are implemented separately because each tool owns a different configuration contract. A global environment-variable mutation is not treated as a valid universal adapter.

## New API user console

The website uses New API's current default-theme user console instead of rebuilding equivalent pages. The initial WBoke navigation keeps:

- Overview: balance, recent usage, request count, API information, announcements, and service status.
- Data dashboard: model usage, token volume, RPM, TPM, and time-range filters.
- API keys: create, revoke, copy, set quota, restrict models, and restrict IPs.
- Usage logs: token, cache, latency, request, and charge details.
- Wallet: CNY balance, redemption-code entry, redemption history, and the approved storefront link.
- Profile: email binding, password, language, and essential account settings.

Chat, playground, referral rewards, extensive sidebar personalization, and other non-core modules are hidden for the first release. They can be enabled later through New API's navigation-module configuration without changing the desktop app.

The screenshots supplied as reference are treated as information-architecture evidence, not a visual asset source. WBoke replaces the third-party brand, copy, group names, prices, and data. The desktop app remains visually quieter and does not duplicate the full website analytics console.

## Public website

`www.wboke.com` uses a small WBoke-owned public frontend for brand, public pricing, access instructions, and the desktop download entry. Authentication, registration, console routes, API calls, and New API frontend assets continue to be served by New API through explicit Caddy path routing. The public frontend does not store credentials or duplicate account state.

The visual system uses the curated `绯红 + 乌漆嘛黑` high-contrast direction as a starting point. The exact `#E41726` red is restricted to primary actions and important labels. Pure black is replaced in the screen UI by accessibility neutrals (`#191918` and `#171716`), with `#F5F4EF` and `#FCFCF9` as the primary surfaces. Green is semantic status color only, not a competing brand accent.

The supplied prompt collection is used selectively as layout reference: the SaaS dashboard-preview pattern informs the product signal, the pricing prompt informs table clarity, and the minimal footer informs hierarchy. External media, copied brands, oversized decorative type, purple gradients, and unrelated interaction patterns are not reused.

## Security boundary

- Website passwords are not stored by the desktop app.
- Refresh credentials and API keys use operating-system secure storage in production.
- New API administrator credentials never reach the desktop app.
- Electron-style Node integration risks do not apply; Tauri commands use a narrow capability allowlist.
- Channel credentials are server-side only and each channel has status, model allowlist, budget, concurrency, and circuit-breaker controls.
- Paid traffic routes only to `approved` channels.

## Deployment

The first deployment uses one Hong Kong host with Caddy, a pinned New API image, PostgreSQL, and Redis. PostgreSQL backups must be copied to separate storage. The web and API origins terminate TLS independently but initially route to the same New API service.

## Deferred production dependencies

The following require operator-supplied external state and are not faked in code: domain DNS, SMTP credentials, Lianxiaopu product URLs and import format, upstream API keys, third-party reseller authorization, code-signing certificate, and supplier-region approval.
