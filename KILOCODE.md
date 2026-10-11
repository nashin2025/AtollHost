# Kilo Code Build Instructions — AtollHost

This file is the execution contract for Kilo Code. It is intentionally text-first: the agent does not need image input to implement the product.

## Start here

Read `README.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `API.md`, `UI_SPEC.md`, `SECURITY.md`, `TESTING.md`, `DEPLOYMENT.md`, and `TASKS.md`. Then inspect the actual repository. Do not assume files or scripts exist until verified.

## Required stack baseline

- React + TypeScript + Vite PWA.
- Supabase: PostgreSQL, Auth, Storage, Edge Functions where server-side execution is needed.
- PostgreSQL RLS as the tenant boundary.
- Zod (or an equivalent shared runtime validator) for external/user input.
- A maintained router and query/state library compatible with the repository.
- Accessible component primitives; implement a shared design system from `UI_SPEC.md`.
- Automated tests for unit logic, component journeys, API/service behavior, and RLS.

If the existing repository already uses compatible alternatives, inspect and document before replacing dependencies.

## Execution protocol

1. Output a concise repository audit: stack, routes, tables/migrations, scripts, test status, and risks.
2. Work only on the first incomplete task group in `TASKS.md` unless the user directs otherwise.
3. For each feature: schema/migration → constraints/indexes/RLS → service/API validation → UI → tests → docs.
4. Never put secrets in frontend code. Use server-side Edge Functions for privileged actions.
5. Never trust client-supplied `organization_id`, `property_id`, role, approval status, or sender identity without verifying it against authenticated membership and the database.
6. Never permit a guest-facing AI message to send without human approval in MVP.
7. Use verified knowledge only; log fact IDs used by the draft and validator decisions. Escalate uncertainty.
8. Ensure human takeover disables automation for that conversation until explicit handback.
9. Label demo/mock actions. Do not represent them as real external calls.
10. Run every available check before marking a task complete.

## UI implementation without image support

Use `UI_SPEC.md` as the authoritative design source. Create shared tokens for color, typography, spacing, radii, shadows, breakpoints, and focus states. Use the screen IDs in `INTERFACE_SCREENS_AND_WORKFLOWS.md`. Every applicable screen must implement loading, empty, error, success, and permission-denied states. Test mobile navigation and tables with narrow viewports. Avoid arbitrary one-off styles.

## Required reporting after each phase

- Implemented task IDs and acceptance criteria.
- Files added/changed and migrations created.
- Tests/build/type checks run and exact outcomes.
- RLS/permission implications and test evidence.
- Remaining blockers, assumptions, and next task IDs.

Do not claim “100% complete” while required tests, migrations, integrations, legal review, or deployment checks remain undone.
