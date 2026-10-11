# Changelog

All notable changes to AtollHost requirements, architecture, and release behavior should be recorded here. Use dates in ISO 8601 and group entries by Added, Changed, Fixed, Security, and Removed.

## Unreleased — Documentation baseline

### Added
- Product requirements for AtollHost as a multi-tenant guesthouse digital-operations platform.
- Text-first instructions for Claude Code and Kilo Code.
- Architecture, relational data model, API/service contracts, UI specification, test plan, deployment runbook, decisions log, privacy/terms drafts, and security controls.
- Explicit distinction between planned/manual/simulated/live integrations.
- Human approval requirement for guest-facing AI sends in MVP.
- Human takeover rule that pauses automation until explicit handback.
- Detailed screen inventory and workflow charts in `INTERFACE_SCREENS_AND_WORKFLOWS.md`.

### Security
- PostgreSQL RLS and server-side authorization identified as mandatory tenant boundaries.
- Prohibition on client-exposed provider secrets and false external-action success states.

### Notes
- This entry describes the documentation baseline, not a claim that every feature is implemented or deployed.
- Record the actual release version, commit, migrations, and tests when software is shipped.
