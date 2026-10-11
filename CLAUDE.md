# Instructions for Claude Code — AtollHost

You are implementing AtollHost, a multi-tenant digital-operations platform for Maldives guesthouses. Read `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `API.md`, `UI_SPEC.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, and `TASKS.md` before making architectural changes.

## Non-negotiable rules

1. **Inspect before editing.** Read the repository, package scripts, migrations, existing UI, and current git diff. Do not overwrite working files blindly.
2. **No guessing.** If a requirement is ambiguous, record the assumption in `DECISIONS.md` and choose the safest reversible option. Never invent integrations, credentials, legal claims, or business facts.
3. **Tenant isolation first.** Every organization/property-owned record must have a clear ownership path and RLS policy. Client-side hiding is not security. Add cross-tenant tests with every relevant table/policy.
4. **AI is not an authority.** Use verified Property Brain facts. Missing, conflicting, or expired facts trigger clarification or escalation. Guest-facing send actions require approval in the MVP.
5. **No fake live integrations.** Demo data and simulated actions must be labelled. Never show “connected”, “sent”, “published”, or “submitted” unless a verified result supports that state.
6. **Small phases.** Implement one task group from `TASKS.md`, run tests/build/type checks, report results, then continue. Do not claim completion for skipped checks.
7. **No secret leakage.** Never put service-role keys, model API keys, OAuth refresh tokens, or signing secrets in browser code, public environment variables, logs, fixtures, or commits.
8. **Schema before feature code.** Define constraints, indexes, RLS, migration rollback/forward strategy, generated types, and tests before wiring the UI to new data.
9. **Accessible responsive UI.** Follow `UI_SPEC.md`; support keyboard operation, visible focus, labels, mobile layouts, and loading/empty/error/success/permission-denied states.
10. **No unsupported compliance claims.** Tax, immigration, tourism, MGIS, and MIRA features are recordkeeping helpers unless an officially verified integration and legal review say otherwise.

## Workflow

1. Report repository status, stack, current scripts, and existing incomplete/unsafe areas.
2. Map each requested task to files and tests before editing.
3. Implement the smallest complete vertical slice, including migration, policies, validation, UI states, tests, and documentation.
4. Run available lint, typecheck, unit, integration, RLS, and build commands. If a command cannot run, state why.
5. Update `TASKS.md`, `CHANGELOG.md`, and `DECISIONS.md` when applicable.
6. Summarize files changed, behavior delivered, commands and results, known limitations, and next task.

## Image limitation

Do not require image understanding. The written `UI_SPEC.md` and `INTERFACE_SCREENS_AND_WORKFLOWS.md` define visual and interaction requirements. Translate the design tokens and screen inventories into components and verify the rendered UI in a browser when browser tooling is available.

## Definition of done

A task is done only when its acceptance criteria are met, security checks are included, automated tests pass or are explicitly blocked with evidence, the UI handles all relevant states, and docs are updated. A polished mockup without working behavior is not a completed feature. A passing build alone is not proof of tenant safety.
