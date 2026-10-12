# AtollHost Implementation Tasks and Release Gates

Use this as a tracked backlog. Mark tasks only when acceptance criteria and tests are complete. Recommended status values: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `DONE`. Do not mark integration tasks done based on UI mocks.

## Phase 0 — Repository audit and decisions
- [x] T0.1 Inspect repo, scripts, dependencies, routes, migrations, existing tests, and current git diff.
- [x] T0.2 Compare current code to all documentation; list gaps and unsafe areas.
- [ ] T0.3 Record decisions for hosting region, email, AI provider, data retention, first pilot channel, and support owner. (Hosting region eu-west-1 confirmed; the rest remain open.)
- [ ] T0.4 Confirm deployment environments and separate Supabase projects for development/staging/production.
**Exit:** baseline report; no destructive edits; open decisions documented.

## Phase 1 — Foundation and design system
Status: scaffold complete, local checks green (lint, typecheck, 6 unit tests, build, dev-server smoke). GitHub CI runs on next push.
- [x] T1.1 Establish typed routes, app shell, error boundary, and protected routes.
- [x] T1.2 Implement tokens, typography, spacing, color, responsive sidebar/topbar, forms, table, dialog, toast, badges, and empty/loading/error states.
- [x] T1.3 Implement keyboard navigation, focus handling, labels, reduced-motion behavior, and mobile layouts.
- [x] T1.4 Add lint, typecheck, unit, and build scripts; CI checks.
**Exit:** app boots from clean install; accessibility smoke checks and CI pass.

## Phase 2 — Identity, organization, and tenant isolation
Status: DONE. Verified end-to-end against the live development Supabase project `whxwazgficyfrpmiqiji` (eu-west-1): signup with mailer autoconfirm, sign-in, organization creation, invite/accept/revoke membership, property assignment/revoke, and all cross-tenant denials. Migrations 0001-0009 applied live; all 15 assertions in `supabase/tests/rls_cross_tenant_checks.sql` pass on local PostgreSQL 17. Edge functions deployed and exercised live.
- [x] T2.1 Supabase Auth flows and profile lifecycle. **Verified live:** sign in, sign up (autoconfirm, no email delivery dependency), forgot/reset password pages, sign out, session guard (`src/features/auth/*`, `src/components/ProtectedRoute.tsx`, `src/components/AppShell.tsx`).
- [x] T2.2 Organization creation and membership/invitation lifecycle. **Verified live:** migration 0007 (lifecycle columns, `organization_invitations`, SECURITY DEFINER procedures with actor verification) plus edge functions `create-organization`, `invite-member`, `accept-invitation`, `revoke-membership` (`supabase/functions/`) and onboarding/invitation UI (`src/features/onboarding/OnboardingPage.tsx`, `src/features/auth/AcceptInvitationPage.tsx`). Invitation tokens are 64-hex via `gen_random_uuid()` (0008); `create_invitation` RETURNING ambiguity fixed (0009).
- [x] T2.3 Property assignments and role/permission model. **Verified live:** migration 0007 role helpers (`is_org_admin`, `is_org_staff`, `is_org_member`, `is_property_member`, `is_property_admin`) and `assign-property-member` / `revoke-property-member` edge functions.
- [x] T2.4 Migrations, foreign keys, uniqueness constraints, indexes, RLS policies, and least-privilege grants. Migrations 0001-0009. Migration 0007 closes the cross-tenant read leak, the membership self-insert escalation, and client-side org creation, and adds actor-id verification to every privileged procedure. Applied and verified on the live dev project.
- [x] T2.5 Automated cross-tenant and cross-property tests for every protected table and storage bucket. `supabase/tests/rls_cross_tenant_checks.sql` (15 assertions at Phase 2, now 40 after the Phase 3 additions: cross-tenant denial, cross-property denial, privilege-escalation fixes, actor spoofing, invitation email binding and single use, revocation, self-revocation, direct-call invitation success path, scanner authorization, and the service-role edge-function call path). All pass on PostgreSQL 17 with migrations 0001-0011 applied; re-run after any RLS change.
**Exit:** unauthenticated and unauthorized requests denied at database/server level; invitation revocation works. **Verified live.** Remaining open items: T0.3 (only hosting region eu-west-1 confirmed so far) and T0.4 (dev project exists; staging/production projects still an owner decision).

## Phase 3 — Properties and Guesthouse Scanner
Status: DONE. Verified end-to-end against the live development Supabase project `whxwazgficyfrpmiqiji`: property create via edge function, scanner run against a live https target (deterministic checks, score, findings), finding review with reviewer recorded, per-target 429 rate limit, and cross-tenant 403 denial. Migrations 0010-0011 applied live; all 40 assertions in `supabase/tests/rls_cross_tenant_checks.sql` pass on PostgreSQL 17, including the service-role edge-function call path. Edge functions `upsert-property`, `run-scanner`, `review-finding` deployed and exercised live.
- [x] T3.1 Property create/edit/archive, team assignment, and audit events. **Verified live:** `upsert_property` (organization admins only; archive records a `property.archived` audit event; actor verified via `assert_actor`), `list_property_team` / `list_organization_members` rosters, properties and scanner pages (`src/features/properties/PropertiesPage.tsx`, `src/features/scanner/ScannerPage.tsx`).
- [x] T3.2 Scanner run lifecycle, sources, findings, confidence, severity, and recommended actions. **Verified live:** `scanner_audits` + `scanner_findings` (source, category, severity, confidence, recommendation, review status) with deterministic checks (reachability, HTTPS preservation, page title, meta description, contact email, contact phone), score = passed/total, audit completion with metadata (final URL, HTTP status).
- [x] T3.3 Manual scan path and controlled fetch behavior; respect site policies and rate limits. **Verified live:** `start_scanner_run` (organization staff or assigned property members only), https-only targets, robots.txt fetched first and disallowed paths stop the scan, 10s fetch / 5s robots timeouts, per-host 60s cooldown (HTTP 429 verified live).
- [x] T3.4 Findings review workflow; no automatic overwrite of verified knowledge. **Verified live:** `review_finding` (organization admins, or property_owner/property_manager of the scanned property), records reviewer and timestamp only and never writes `knowledge_items` (asserted in tests).
**Exit:** scanner can produce reviewed findings without silently changing approved property facts. **Verified live.**

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
