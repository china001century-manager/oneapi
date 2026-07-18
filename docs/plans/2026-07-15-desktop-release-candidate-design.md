# Desktop Release Candidate Design

Date: 2026-07-15
Status: Approved

## Scope

Build an unsigned Windows release candidate of the existing Tauri 2 desktop companion. The public website and New API remain the source of truth for registration, wallet, redemption, pricing, API-key administration, and usage logs. The desktop application focuses on authenticated account access and safe local configuration.

The first release candidate supports Codex CLI, Claude Code, Gemini CLI, and tested CC Switch versions. Unknown CC Switch versions are detected but never modified.

## Security Boundary

- Rust owns the authenticated HTTP client, cookies, API-key retrieval, configuration writes, backups, and restores.
- React receives masked key data only. Full API keys are never serialized into the webview state.
- The client finds a token named `六脉神剑 Desktop`; it never reuses an unrelated active token. It creates the dedicated token only when absent.
- Passwords and authenticated sessions are not persisted between application launches.
- Tool configuration files necessarily contain the dedicated API key. Writes are preceded by backups, validated after writing, and rolled back when any step fails.
- A persistent, secret-free manifest records the latest transaction for one-click restore.
- External links use an explicit HTTPS allowlist containing WBoke and the approved Lianxiaopu storefront.

## User Experience

The login screen uses the `六脉神剑API` brand and provides password visibility, registration, forgotten-password, and two-factor authentication flows. After login, the application displays real account identity, balance, group, masked key, API endpoint, and service health.

Wallet, redemption, pricing, usage logs, and full key administration open the corresponding pages on `https://www.wboke.com`. The desktop does not duplicate New API billing or model catalog state.

The tools view shows executable detection, version, configuration path, adapter support, and restore availability. Applying a configuration requires an explicit preview and confirmation. Results distinguish unsupported versions, malformed existing files, access failures, network failures, and upstream/API incompatibility.

## Tool Adapters

- Codex CLI: configure the WBoke Responses provider and the current supported model in `~/.codex/config.toml`; store the dedicated key in `~/.codex/auth.json`.
- Claude Code: update only WBoke-owned environment keys in `~/.claude/settings.json` and use the Anthropic-compatible WBoke origin.
- Gemini CLI: update only WBoke-owned variables in `~/.gemini/.env` and use the Gemini-compatible WBoke origin.
- CC Switch: detect its installed version and storage format. Modify only versions and schemas covered by fixtures and tests; otherwise provide a clear unsupported-version result.

## Release Acceptance

- Frontend type checks and unit tests pass.
- Rust unit and integration tests pass.
- Repeated apply is idempotent for all supported adapters.
- Empty, existing, malformed, read-only, backup, rollback, and restore cases are tested.
- A real WBoke test user can log in, configure each supported installed tool, and complete a `gpt-5.5` request.
- Build outputs include an unsigned MSI, portable executable/archive, version, SHA256 checksums, and release notes.
- The unsigned build remains internal-only. Public commercial distribution requires an OV/EV signing certificate or Microsoft Store signing, backend pricing completion, production channel acceptance, and an operator-approved release checklist.
