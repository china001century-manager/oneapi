# Documentation Index

This directory separates current, reusable project knowledge from temporary planning and local operational records.

## Current Documents

- `HANDOFF.md`: sanitized architecture, deployment, verification, and continuation guide for a new agent or server.
- `plans/2026-07-14-agentmail-smtp-relay-design.md`: accepted private SMTP relay design.
- `plans/2026-07-14-newapi-desktop-design.md`: accepted product and platform boundaries.
- `plans/2026-07-15-desktop-release-candidate-design.md`: current Windows release-candidate scope and acceptance criteria.

## Local-Only Operations

`operations/` is intentionally ignored by Git. It contains detailed platform relationships, account identifiers, incident records, release history, and operator checklists. A fresh clone must be paired with the current encrypted operations bundle or password-manager records before production administration.

The canonical local files are:

- `00-project-status.md`
- `01-user-guide.md`
- `02-admin-runbook.md`
- `03-project-management.md`
- `04-upstream-channel-guide.md`
- `05-desktop-release-candidate.md`
- dated production update records

No real password, API key, database URL, recovery code, redemption code, or signing key belongs in either tracked or local documentation.

## Lifecycle Rules

- A plan remains only while its decisions still describe the product or implementation.
- Temporary handoff notes are merged into `HANDOFF.md` or the local canonical files, then deleted.
- Superseded deployment experiments are deleted; Git history remains the archive.
- Every production change updates the local status and a dated production record.
- When external state differs from a document, verify the runtime and update the document immediately.
