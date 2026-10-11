# AtollHost

AtollHost is a multi-tenant digital-operations platform for Maldives guesthouses. It helps an agency manage multiple properties, coordinate enquiries and tasks, maintain verified property knowledge, and use AI to draft responses safely with human approval.

> **Product boundary:** AtollHost is not a full PMS, channel manager, booking engine, POS, accounting system, or government submission platform. External connections must be explicitly implemented, authorized, tested, and enabled.

## Documentation map

- `PRD.md` — product scope and requirements
- `CLAUDE.md` — Claude Code rules
- `KILOCODE.md` — Kilo Code execution instructions (text-first; no image capability required)
- `ARCHITECTURE.md` — system structure and boundaries
- `TASKS.md` — phased implementation backlog and release gates
- `DATA_MODEL.md` — relational model, constraints, RLS expectations
- `API.md` — API/service contracts and error conventions
- `UI_SPEC.md` — design system and screen behavior
- `TESTING.md` — test strategy and acceptance matrix
- `DEPLOYMENT.md` — environments, deployment, migrations, recovery
- `DECISIONS.md` — decisions and unresolved items
- `CHANGELOG.md` — release history
- `PRIVACY.md` — privacy policy draft and data handling
- `TERMS.md` — terms of service draft
- `SECURITY.md` — threat model and security controls
- `LICENSE` — default proprietary license notice
- `INTERFACE_SCREENS_AND_WORKFLOWS.md` — detailed screen inventory and Mermaid flows

## Technology baseline

- React + TypeScript + Vite, delivered as a responsive PWA.
- Supabase Auth, PostgreSQL, Storage, and Edge Functions where server-side execution is required.
- PostgreSQL RLS is the enforcement boundary for tenant data.
- Server-side adapters for AI and external integrations.

The actual repository may contain incomplete foundations. Inspect `package.json`, source files, migrations, and tests before assuming a feature exists.

## Getting started

1. Install a current supported Node.js LTS release and npm.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` if present and populate only public client configuration there. Never put service-role keys or AI provider secrets in `VITE_*` variables.
4. Create a Supabase development project and configure the project URL and anon/publishable key.
5. Apply migrations using the documented Supabase workflow after reviewing them. Do not run unreviewed migrations against production.
6. Start the app using the script that actually exists in `package.json` (typically `npm run dev`).
7. Run lint/typecheck/tests/build scripts that exist. If missing, implement them before relying on CI.

Do not assume this documentation archive itself contains a fully runnable app. It defines the product and implementation contract. The source repository, database migrations, environment setup, and required checks must be validated separately.

## Security essentials

- Keep organization and property ownership in the database and enforce it with RLS.
- Verify permissions again in privileged server functions.
- Keep all provider secrets server-side.
- Require human approval before guest-facing AI sends in MVP.
- Human takeover pauses automation until explicit handback.
- Do not expose real guest personal data in test fixtures.

## Local quality checks

Use the scripts available in `package.json`. At minimum the project should have typecheck, lint, unit/component tests, RLS/integration tests, and production build checks. See `TESTING.md`.

## Product status

This is a requirements and engineering documentation baseline. It does not certify legal compliance, live integration availability, or production readiness. See `TASKS.md` for completion gates and `DECISIONS.md` for decisions that require product-owner confirmation.
