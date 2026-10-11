# AtollHost Implementation Tasks and Release Gates

Use this as a tracked backlog. Mark tasks only when acceptance criteria and tests are complete. Recommended status values: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Do not mark integration tasks done based on UI mocks.

## Phase 0 — Repository audit and decisions
- [ ] T0.1 Inspect repo, scripts, dependencies, routes, migrations, existing tests, and current git diff.
- [ ] T0.2 Compare current code to all documentation; list gaps and unsafe areas.
- [ ] T0.3 Record decisions for hosting region, email, AI provider, data retention, first pilot channel, and support owner.
- [ ] T0.4 Confirm deployment environments and separate Supabase projects for development/staging/production.
**Exit:** baseline report; no destructive edits; open decisions documented.

## Phase 1 — Foundation and design system
- [ ] T1.1 Establish typed routes, app shell, error boundary, and protected routes.
- [ ] T1.2 Implement tokens, typography, spacing, color, responsive sidebar/topbar, forms, table, dialog, toast, badges, and empty/loading/error states.
- [ ] T1.3 Implement keyboard navigation, focus handling, labels, reduced-motion behavior, and mobile layouts.
- [ ] T1.4 Add lint, typecheck, unit, and build scripts; CI checks.
**Exit:** app boots from clean install; accessibility smoke checks and CI pass.

## Phase 2 — Identity, organization, and tenant isolation
- [ ] T2.1 Supabase Auth flows and profile lifecycle.
- [ ] T2.2 Organization creation and membership/invitation lifecycle.
- [ ] T2.3 Property assignments and role/permission model.
- [ ] T2.4 Migrations, foreign keys, uniqueness constraints, indexes, RLS policies, and least-privilege grants.
- [ ] T2.5 Automated cross-tenant and cross-property tests for every protected table and storage bucket.
**Exit:** unauthenticated and unauthorized requests denied at database/server level; invitation revocation works.

## Phase 3 — Properties and Guesthouse Scanner
- [ ] T3.1 Property create/edit/archive, team assignment, and audit events.
- [ ] T3.2 Scanner run lifecycle, sources, findings, confidence, severity, and recommended actions.
- [ ] T3.3 Manual scan path and controlled fetch behavior; respect site policies and rate limits.
- [ ] T3.4 Findings review workflow; no automatic overwrite of verified knowledge.
**Exit:** scanner can produce reviewed findings without silently changing approved property facts.

## Phase 4 — Property Brain
- [ ] T4.1 Knowledge categories, versioned facts, sources, status, reviewer, and expiry.
- [ ] T4.2 Review/approve/reject/edit workflow and audit trail.
- [ ] T4.3 Search/filter and property-scoped retrieval service.
- [ ] T4.4 Tests proving draft retrieval excludes draft/rejected/expired facts.
**Exit:** only verified current facts are eligible for guest-facing AI context.

## Phase 5 — Enquiries and inbox
- [ ] T5.1 Enquiry create/import, classification, assignment, status, follow-up, and outcome.
- [ ] T5.2 Conversation/message timeline with safe attachment metadata handling.
- [ ] T5.3 Search, filters, unread/urgent indicators, and mobile inbox.
- [ ] T5.4 Human takeover, automation pause, explicit handback, and audit events.
**Exit:** manual enquiry-to-resolution journey works and takeover reliably stops automation.

## Phase 6 — AI draft and approval pipeline
- [ ] T6.1 Server-side provider adapter and timeout/rate-limit/error handling.
- [ ] T6.2 Structured output schema, grounded source references, and prompt versioning.
- [ ] T6.3 Policy validator for unsupported facts, sensitive topics, prompt injection, and action boundaries.
- [ ] T6.4 Draft edit/approve/reject; approval binds to exact version.
- [ ] T6.5 No-send-without-approval tests and no-hallucination unknown-answer tests.
- [ ] T6.6 Record execution result and reconcile ambiguous timeouts.
**Exit:** no AI guest message can send without an authorized human approval in MVP.

## Phase 7 — Tasks, guest journey, reviews, content
- [ ] T7.1 Task assignment, comments, due dates, reminders, completion, and overdue state.
- [ ] T7.2 Guest journey event timeline; automations default off until configured and approved.
- [ ] T7.3 Review tracking and response draft approval.
- [ ] T7.4 Content calendar and honest manual-vs-integration publication states.
**Exit:** core workflows work without falsely claiming external publication or delivery.

## Phase 8 — Reports and exports
- [ ] T8.1 Metric definitions and date-bound report queries.
- [ ] T8.2 Agency and property report views with property-scoped data.
- [ ] T8.3 Permission-checked CSV exports, injection-safe cell encoding, and export audit.
**Exit:** totals reconcile with source records and unauthorized exports are denied.

## Phase 9 — Integrations
- [ ] T9.1 Integration registry, authorization lifecycle, health state, and secret handling.
- [ ] T9.2 First provider selected based on pilot evidence and confirmed API access.
- [ ] T9.3 Webhook signature verification, idempotency, replay handling, and retry policy.
- [ ] T9.4 Provider sandbox tests and documented failure/recovery paths.
**Exit:** only a verified adapter can show connected or successful action state.

## Phase 10 — Owner portal and hardening
- [ ] T10.1 Owner dashboard and assigned-property profile/knowledge/tasks/reports.
- [ ] T10.2 Owner permissions and all owner-to-other-property negative tests.
- [ ] T10.3 Security review, dependency scan, secrets scan, backup/restore drill, and privacy review.
- [ ] T10.4 Mobile/browser compatibility, accessibility pass, and performance checks.
**Exit:** release gates in `SECURITY.md`, `TESTING.md`, and `DEPLOYMENT.md` pass.

## Phase 11 — Pilot and release
- [ ] T11.1 Pilot onboarding guide and support/incident process.
- [ ] T11.2 Verify all pilot property facts with owners; obtain permissions/consents.
- [ ] T11.3 Train operators on approvals, takeover, corrections, and integration failure handling.
- [ ] T11.4 Run production smoke tests, monitor logs, and capture feedback.
- [ ] T11.5 Publish release notes and rollback plan.
**Exit:** product owner explicitly approves release; unresolved high-severity security or data issues block launch.

## Global done criteria
A task requires implementation, automated tests, appropriate RLS tests, UI states, documentation updates, and successful checks. “Mocked,” “planned,” “manual,” and “live” must be distinguished accurately.
