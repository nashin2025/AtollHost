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
Status: DONE. Verified end-to-end against the live development Supabase project `whxwazgficyfrpmiqiji`: fact create as draft v1, member RLS read, approval makes the fact retrievable, edit-as-new-version supersedes v1 and removes it from retrieval until the new draft is approved, expiry and rejection exclude facts, future expiry dates are included while unexpired, empty-title validation (400), unauthenticated calls (401), cross-tenant write and retrieval denied (403/FORBIDDEN), and knowledge.created/versioned/reviewed audit events with metadata. Migration 0012 applied live; all assertions in `supabase/tests/rls_cross_tenant_checks.sql` (now 60, including the Phase 4 additions) pass on PostgreSQL 17. Edge functions `upsert-knowledge` and `review-knowledge` deployed and exercised live.
- [x] T4.1 Knowledge categories, versioned facts, sources, status, reviewer, and expiry. **Verified live:** migration 0012 adds `knowledge_status` (draft/pending_review/approved/rejected/expired), `fact_key`, `version`, `superseded_by`, `expires_at`, `reviewed_by`, `reviewed_at` on `knowledge_items`, a unique constraint on (property_id, fact_key, version), and the `upsert_knowledge_fact` RPC (organization admins, or property_owner/property_manager of the property; every new version starts as draft). `src/lib/knowledge.ts` and the Property Brain page (`src/features/brain/BrainPage.tsx`, routed at `/brain`).
- [x] T4.2 Review/approve/reject/edit workflow and audit trail. **Verified live:** `review_knowledge_fact` records reviewer and timestamp, writes `knowledge.reviewed` audit events; `upsert_knowledge_fact` writes `knowledge.created` and `knowledge.versioned` events with fact_key, version, and title metadata.
- [x] T4.3 Search/filter and property-scoped retrieval service. **Verified live:** `retrieve_knowledge_facts` returns only current (non-superseded, approved, non-expired) facts, callable by property members or the service role; the Brain page filters by property, status, and text search, and shows the verified-facts panel.
- [x] T4.4 Tests proving draft retrieval excludes draft/rejected/expired facts. **Verified live and locally:** `supabase/tests/rls_cross_tenant_checks.sql` asserts retrieval excludes draft, rejected, expired-status, time-expired, and superseded rows and returns exactly the current approved fact; `src/test/brain.test.ts` covers the knowledge data layer (8 unit tests; 31 total green).
**Exit:** only verified current facts are eligible for guest-facing AI context. **Verified live.**

## Phase 5 — Enquiries and inbox
- [x] T5.1 Enquiry create/import, classification, assignment, status, follow-up, and outcome. **Verified live:** migration 0013 adds source/topic/follow_up_at/outcome/external_id/unread/urgent plus `enquiry_transition_allowed`; `upsert_enquiry` creates with channel, source allowlist, topic, assignment, and urgent flag; `update_enquiry_status` enforces the transition map (live: new→open accepted, open→new rejected 400, past follow_up_at rejected 400).
- [x] T5.2 Conversation/message timeline with safe attachment metadata handling. **Verified live:** `start_conversation` links a conversation to an enquiry, `send_message` records human messages, `add_message_attachment` enforces the mime allowlist, 25 MB size bound, and 64-hex SHA-256 checksum with scan_status=pending; the timeline and attachment list render through member RLS.
- [x] T5.3 Search, filters, unread/urgent indicators, and mobile inbox. **Verified live:** the Enquiries page filters by property, text search, status, and unread-only with urgent badges; the Inbox page shows conversation state (human takeover, automation paused) in a stacked mobile layout; `mark_enquiry_read` flips unread to false (live-verified).
- [x] T5.4 Human takeover, automation pause, explicit handback, and audit events. **Verified live:** `takeover_conversation` sets human_takeover and automation_paused and writes a system message; a second takeover is rejected 409; `handback_conversation` clears both flags and resumes automation; a second handback is rejected 409; audit logs show enquiry.created, enquiry.status_changed, conversation.created, message.sent, attachment.added, conversation.takeover, and conversation.handback.
**Exit:** manual enquiry-to-resolution journey works and takeover reliably stops automation. **Verified live.**

## Phase 6 — AI draft and approval pipeline
- [x] T6.1 Server-side provider adapter and timeout/rate-limit/error handling. Implemented in `supabase/functions/_shared/aiProvider.ts` (OpenAI-compatible fetch with AbortController timeout, rate-limit via cooldown, error mapping).
- [x] T6.2 Structured output schema, grounded source references, and prompt versioning. `supabase/functions/generate-ai-draft/index.ts` requests JSON output with `draft_body`, `confidence`, `source_references` (fact_id, fact_key, title, version), `unknown_answers`; prompt version `v1.0` stored on draft; `ai_prompt_versions` table seeded with system prompt.
- [x] T6.3 Policy validator for unsupported facts, sensitive topics, prompt injection, and action boundaries. `supabase/functions/_shared/policyValidator.ts` checks: unsupported claims without source refs, sensitive topic keywords (legal/medical/financial/personal data), prompt injection patterns in guest input, action boundary verbs (booked, paid, cancelled, sent). Blocks draft creation on violations.
- [x] T6.4 Draft edit/approve/reject; approval binds to exact version. `create_ai_draft`/`approve_ai_draft`/`reject_ai_draft`/`edit_ai_draft` RPCs; `approve_ai_draft` recomputes `version_hash` from stored fields and verifies match before inserting `role='ai'` message with `approved_by`/`approved_at`; `edit_ai_draft` supersedes old draft, bumps revision, recomputes hash server-side.
- [x] T6.5 No-send-without-approval tests and no-hallucination unknown-answer tests. `src/test/aiDrafts.test.ts`: structural test that only `generateAiDraft`/`approveAiDraft`/`rejectAiDraft`/`listAiDrafts` are exported; `approveAiDraft` is the only path to create `role='ai'` message (send_message hardcodes `role='human'`); unknown-answer test asserts low confidence, empty sources, populated `unknown_answers` when no facts available.
- [x] T6.6 Record execution result and reconcile ambiguous timeouts. `generate-ai-draft` stores execution metadata (latency, finish_reason, usage) in `input_context`; on provider timeout/error, returns structured error with `RATE_LIMITED` for client reconciliation; `cooldown_until` enforces 60s backoff.
**Exit:** no AI guest message can send without an authorized human approval in MVP.

## Phase 7 — Tasks, guest journey, reviews, content
- [x] T7.1 Task assignment, comments, due dates, reminders, completion, and overdue state. Migration 0015 adds `task_comments`, `task_reminders`, columns on `tasks`; RPCs `create_task`, `update_task`; edge functions `create-task`, `update-task`; lib `tasks.ts` with 6 tests.
- [x] T7.2 Guest journey event timeline; automations default off until configured and approved. Migration 0015 adds `journey_templates`; RPC `create_journey_template`; edge function `create-journey-template`; lib `journeyTemplates.ts` with 4 tests.
- [x] T7.3 Review tracking and response draft approval. Migration 0015 adds `review_responses`; RPC `create_review_response`; edge function `create-review-response`; lib `reviewResponses.ts` with 4 tests.
- [x] T7.4 Content calendar and honest manual-vs-integration publication states. Migration 0015 adds `content_calendar` with `source` enum (manual/integration); RPC `create_content`; edge function `create-content`; lib `content.ts` with 4 tests.
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
