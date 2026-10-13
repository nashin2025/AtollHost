# AtollHost Release Notes - v1.0.0 (Pilot Release)

## Release Date: 2026-10-13
## Version: 1.0.0-pilot
## Git Tag: v1.0.0-pilot
## Commit: ca42fcc

---

## Overview
This is the initial pilot release of AtollHost, a guesthouse digital-operations platform for multi-property agencies in the Maldives and similar markets.

---

## Features Included

### Phase 1: Foundation
- React 18 + TypeScript + Vite web application
- Typed routing with React Router v6
- Auth-gated routing with Supabase Auth
- UI primitives: Button, Field, Badge, Dialog, DataTable, Toast, States
- Error boundaries and accessibility foundations

### Phase 2: Identity & Tenant Isolation
- Supabase Auth flows (signup, login, password reset, invite/accept/revoke)
- Organization creation and membership lifecycle
- Property assignments with role-based permissions
- Cross-tenant RLS enforcement (15 assertions passing)
- Edge functions: create-organization, invite-member, accept-invitation, revoke-membership, assign-property-member, revoke-property-member

### Phase 3: Properties & Scanner
- Property CRUD with team assignment
- Guesthouse Scanner with deterministic checks (reachability, HTTPS, title, meta, contact)
- Scanner findings review workflow (never overwrites verified knowledge)
- Rate limiting (per-target 429, robots.txt respect)

### Phase 4: Property Brain (Versioned Knowledge)
- Versioned knowledge facts with draft/pending_review/approved/rejected/expired lifecycle
- Fact versioning with supersession
- Grounded retrieval: only approved, non-superseded, non-expired facts
- Edge functions: upsert-knowledge, review-knowledge

### Phase 5: Enquiries & Inbox
- Enquiry lifecycle with status transitions
- Conversation timeline with human/guest/ai/system messages
- Human takeover / automation pause / handback
- Attachment metadata (mime allowlist, 25MB limit, SHA-256 checksum)

### Phase 6: AI Draft & Approval Pipeline
- Provider-agnostic AI adapter (OpenAI-compatible)
- Structured output: draft_body, confidence, source_references, unknown_answers
- Policy validator: unsupported facts, sensitive topics, prompt injection, action boundaries
- Version-hash binding: approval binds to exact draft version
- No-send-without-approval guarantee (send_message hardcodes role='human')

### Phase 7: Tasks, Guest Journey, Reviews, Content
- Task management with comments, due dates, priorities
- Guest journey templates with trigger types
- Review response AI drafts with approval workflow
- Content calendar with honest manual/integration source tracking

### Phase 8: Reports & Exports
- Materialized views: property performance, agent performance
- Report definitions with parameterized SQL
- Export jobs with CSV/JSON, injection-safe encoding
- Permission-checked exports with audit trail

### Phase 8: Reports & Exports
- Materialized views: property performance, agent performance
- Report definitions with parameterized SQL
- Export jobs with CSV/JSON, injection-safe encoding
- Permission-checked exports with audit trail

### Phase 9: Integrations
- Integration registry with OAuth/API key auth
- Encrypted credential storage
- Webhook configuration with HMAC signature verification
- Idempotent event log with replay handling
- Exponential backoff retry with configurable limits
- Health checks with status tracking
- Rate limiting per integration

### Phase 10: Owner Portal & Hardening
- Owner portal with granular permissions
- Owner dashboard: revenue, occupancy, enquiries, reviews, tasks, knowledge
- Granular owner permissions (revenue, occupancy, reviews, tasks, knowledge, reports)
- Security audit log (dependency scan, secrets scan, backup restore, privacy review)
- Backup job scheduling and tracking

---

## Deployment Information

### Supabase Project
- **Project**: atollhost-dev (whxwazgficyfrpmiqiji)
- **Region**: eu-west-1
- **PostgreSQL**: 17
- **Edge Runtime**: Deno

### Edge Functions (48 total)
- Authentication: create-organization, invite-member, accept-invitation, revoke-membership, assign-property-member, revoke-property-member
- Properties/Scanner: upsert-property, run-scanner, review-finding
- Knowledge: upsert-knowledge, review-knowledge
- Enquiries/Inbox: upsert-enquiry, update-enquiry, start-conversation, send-message, takeover-conversation, handback-conversation, mark-enquiry-read, add-message-attachment
- AI Drafts: generate-ai-draft, approve-ai-draft, reject-ai-draft
- Phase 7: create-task, update-task, create-content, create-review-response, create-journey-template
- Reports/Exports: execute-report, create-export-job, get-export-job, list-report-definitions
- Integrations: set-integration-credential, create-integration-webhook, record-integration-event, process-integration-event, record-integration-health
- Owner Portal: get-owner-dashboard, grant-owner-access, revoke-owner-access, record-security-audit, update-security-audit, schedule-backup-job, complete-backup-job

### Secrets Required
- `AI_PROVIDER_URL` (e.g., https://integrate.api.nvidia.com/v1)
- `AI_PROVIDER_API_KEY` (provider API key)
- `AI_MODEL` (e.g., nvidia/nemotron-3-nano-omni-30b-a3b-reasoning)
- `SUPABASE_ACCESS_TOKEN` (for CI/CD)

### Database Migrations (19 total)
1. 0001_initial_schema
2. 0002_functions
3. 0003_rls
4. 0004_indexes
5. 0005_seed
6. 0006_scanner_reviews_integrations
6. 0007_phase2_identity_lifecycle
7. 0008_fix_invitation_token_generation
8. 0009_fix_invitation_returning_ambiguity
9. 0010_phase3_properties_scanner
10. 0011_fix_phase3_rpc_actor_checks
11. 0012_phase4_property_brain
12. 0013_phase5_enquiries_inbox
13. 0014_phase6_ai_drafts
14. 0015_phase7_tasks_journey_reviews_content
15. 0016_phase7_rpcs
16. 0017_phase8_reports_exports
17. 0018_phase9_integrations
18. 0019_phase10_owner_portal

---

## Testing
- **Unit Tests**: 106 passing (Vitest + Testing Library)
- **RLS Tests**: 60+ assertions in supabase/tests/rls_cross_tenant_checks.sql
- **Build**: Vite production build successful
- **Lint**: ESLint clean
- **TypeCheck**: TypeScript strict mode clean

---

## Known Limitations (Pilot)
1. **AI Provider**: Single provider configured (NVIDIA Nemotron 3 Ultra). Multi-provider support planned.
2. **Channels**: Webhook-based channels only. Native WhatsApp/Email/SMS adapters planned.
3. **Automations**: Guest journey automations default OFF. Manual approval required.
4. **Reports**: Two materialized views only. Custom report builder planned.
5. **Exports**: CSV/JSON only. PDF reports planned.
6. **Mobile App**: Responsive PWA only. Native mobile app planned.

---

## Security
- All RLS policies enforce property/organization isolation
- Service role only for edge functions
- Encrypted credential storage for integrations
- HMAC-SHA256 webhook signature verification
- Idempotent event processing with replay handling
- Security audit log for compliance tracking
- Backup job scheduling with status tracking

---

## Support Contacts
- **Product**: product@atollhost.com
- **Engineering**: eng@atollhost.com
- **Security**: security@atollhost.com
- **Emergency P0**: +1-XXX-XXX-XXXX

---

## Rollback Plan
See [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md)