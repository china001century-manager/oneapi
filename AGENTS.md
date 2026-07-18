# 六脉神剑API Repository Rules

These rules apply to every agent and operator working in this repository.

## Start Here

1. Read `README.md`, `docs/README.md`, and `docs/HANDOFF.md`.
2. Run `git status --short --branch` before editing. Preserve all existing changes and untracked source files.
3. If the local-only `docs/operations/` directory exists, read `00-project-status.md` before production work.
4. Verify external state before changing it. Documentation records the last known state, not a guarantee that a hosted service is still healthy.

## Sources of Truth

- Code and deployment configuration: the Git repository.
- Sanitized architecture and handoff state: `docs/HANDOFF.md`.
- Current desktop release scope: `docs/plans/2026-07-15-desktop-release-candidate-design.md`.
- Detailed account, platform, incident, and release records: local-only `docs/operations/`.
- Production runtime truth: Railway, Vercel, New API, AgentMail, DNS, and database consoles after direct verification.

When sources disagree, do not silently choose one. Verify the runtime, then update the relevant documents in the same change.

## Secrets

- Never commit or echo API keys, passwords, cookies, database URLs, SMTP credentials, DNS tokens, recovery codes, redemption codes, or signing keys.
- Use placeholders such as `<SECRET:UPSTREAM_API_KEY>` and `<在密码管理器中填写>`.
- Keep real credentials in the approved password manager. `docs/operations/` may record account relationships and placeholders, never secret values.
- Any credential exposed in chat, logs, screenshots, or Git must be revoked or rotated before further use.

## Change Discipline

- Keep changes scoped; do not reformat or rewrite unrelated files.
- Do not run `git clean`, `git reset --hard`, or delete untracked files without identifying them first.
- Do not upgrade the pinned New API image without a database backup, migration review, test deployment, and rollback plan.
- Do not enable an upstream channel for paid users until protocol, model, pricing, quota deduction, and fallback tests pass.
- Do not claim commercial readiness until the acceptance gates in `docs/HANDOFF.md` pass.

## Verification

From the repository root:

```powershell
pnpm install
pnpm check
pnpm test
pnpm build
cargo test --offline --manifest-path apps/desktop/src-tauri/Cargo.toml
```

For deployment-only changes, also run `pnpm verify:deploy`. For a desktop release candidate, use `pnpm --filter @wboke/desktop package:rc` and record the artifact hashes locally.

## Deployment Safety

- Test a Vercel deployment URL before assigning `www.wboke.com`.
- Verify `/`, `/api/status`, `/sign-in`, `/dashboard`, `/api/token/`, and unauthenticated `/v1/models` after each routing change.
- Preserve exact-route rewrites before wildcard rewrites to avoid redirect loops.
- Back up PostgreSQL outside the hosting provider and complete a restore drill before accepting production payments.
- Keep the SMTP relay private. Never expose port 2525 publicly.

## Documentation Updates

- Update `docs/HANDOFF.md` when architecture, public endpoints, deployment commands, or release blockers change.
- Update local `docs/operations/` after every production deployment, credential rotation, incident, channel change, or backup drill.
- Remove superseded temporary handoff files after merging their still-valid facts into the canonical documents.
