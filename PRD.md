# AtollHost — Product Requirements Document

**Document status:** Product baseline for MVP planning; production launch requires the release gates in `TASKS.md`, `SECURITY.md`, and `DEPLOYMENT.md`.
**Product:** AtollHost
**Category:** Multi-tenant guesthouse digital-operations platform and managed service
**Primary market:** Guesthouses and small accommodation operators in the Maldives

## 1. Product summary

AtollHost helps an agency operate digital guest communication and day-to-day workflows for multiple guesthouses from one workspace. Each guesthouse owner receives a property-scoped portal. A property-specific, verified knowledge base (“Property Brain”) grounds AI-generated drafts in approved facts. Staff can review drafts, take over a conversation, assign work, manage enquiries, respond to reviews, prepare content, track integration health, and produce operational reports.

**Positioning:** “One dashboard. One AI assistant. Every guesthouse.” AtollHost is an operations layer, not a replacement for a property-management system (PMS), booking engine, channel manager, accounting platform, or government system.

## 2. Problem and opportunity

Small guesthouses commonly handle enquiries and guest questions across disconnected channels, manually repeat property information, miss follow-ups, and lack a shared view of tasks and digital performance. Existing tools may solve parts of the problem, but the agency still needs a safe, consistent way to coordinate work across properties. AtollHost centralizes operational work while preserving the property owner’s control and the human ability to intervene.

## 3. Goals

1. Give an agency one workspace to manage multiple properties without cross-property data leakage.
2. Give each owner access only to the properties and capabilities explicitly assigned to them.
3. Turn property information into a reviewable, versioned knowledge source for guest-facing AI drafts.
4. Make enquiries, conversations, tasks, reviews, content, and basic reporting trackable.
5. Reduce missed follow-ups and repetitive manual work while measuring outcomes honestly.
6. Support a progressive integration strategy: manual/CSV first, verified adapters later.
7. Be usable as a responsive Progressive Web App (PWA) on desktop and mobile browsers.

## 4. Non-goals for the MVP

- A full PMS, room inventory system, channel manager, OTA extranet replacement, booking engine, payment processor, POS, accounting ledger, or native iOS/Android app.
- Claiming real-time availability or reservation confirmation unless an authorized integration supplies and verifies that data.
- Automatically submitting tax returns or government records without an approved, tested integration and explicit authorization.
- Unsupervised AI sending of sensitive, financial, legal, refund, cancellation, or uncertain answers.
- Scraping websites or platforms in violation of their terms.
- Presenting estimated time savings, influenced revenue, or AI performance as audited facts.

## 5. Users and roles

- **Agency owner/admin:** manages organization settings, members, properties, permissions, billing configuration if added later, and high-risk actions.
- **Agency operator/agent:** works on assigned properties, enquiries, conversations, tasks, knowledge, reviews, and content within granted permissions.
- **Property owner:** views and manages only explicitly assigned property data; approves property facts, drafts, tasks, and reports according to permissions.
- **Property staff:** limited property-scoped access to operational tasks and conversations.
- **Platform administrator:** restricted internal operations role; access must be controlled, audited, and not used as an ordinary customer role.

A user can hold different roles for different organizations or properties. Role checks are server-side and database-enforced, not only hidden in the UI.

## 6. Primary journeys

1. Sign up/sign in → create organization → invite teammate → create property → complete profile → run Guesthouse Scanner → review findings → verify Property Brain facts.
2. Receive/import enquiry → classify and assign → view approved property facts → generate AI draft → validate and approve/edit → send only through a configured channel → record result and next action.
3. Staff member takes over conversation → automation pauses for that conversation → human responds → handback is explicit and audited.
4. Create/assign task → due-date reminder → completion evidence/comment → dashboard reflects state.
5. Add review → prepare response draft → human approval → publish manually or through a verified supported integration.
6. Connect integration → authorize scope → test connection → show honest health state → handle token expiry/failure safely.
7. Owner signs in → sees assigned property summary → reviews work and reports without access to other tenants.

## 7. MVP functional requirements

### 7.1 Identity and access
- Email-based authentication using the configured Supabase Auth project.
- Organization membership and property-level assignments.
- Invitations expire, can be revoked, and cannot grant broader access than the inviter possesses.
- Profile, organization, and property access are enforced by PostgreSQL Row Level Security (RLS) and server-side checks.
- Unauthorized access returns a safe error and is logged without leaking the target record.

### 7.2 Agency workspace
- Overview of assigned properties, open enquiries, unread conversations, overdue tasks, pending approvals, scanner findings, and integration health.
- Property list with search, filters, status, assigned team, and last activity.
- Property create/edit/archive workflow with audit trail and destructive-action confirmation.
- Member invitations, role assignment, and access revocation.

### 7.3 Guesthouse Scanner
- Collect public-facing property details and allow manual review of the findings.
- Each finding records source, observation time, category, severity, confidence, and recommended action.
- Scanner findings are suggestions, not verified facts. They must not silently overwrite Property Brain facts.
- Website scanning must respect robots/terms and rate limits; no bypassing access controls.
- Scanner can operate manually where automated fetch is unavailable.

### 7.4 Property Brain
- Versioned facts: property name, location, contact details, room descriptions, amenities, check-in/out rules, policies, transfers, FAQs, accessibility notes, and approved public copy.
- Each fact has status (`draft`, `pending_review`, `verified`, `rejected`, `expired`), source, reviewer, timestamps, and optional expiry.
- AI guest-facing drafts can use only verified, current facts. If a fact is missing, conflicting, or expired, AI must ask for clarification or escalate.
- Changes are versioned; prior versions remain auditable subject to retention policy.

### 7.5 Enquiries and conversations
- Record enquiry source, contact, property, received time, topic, status, owner, next follow-up, and outcome when known.
- Conversation timeline stores messages, AI drafts, approvals, human messages, attachments metadata, and delivery results.
- Search/filter by property, status, assignee, source, urgency, and date.
- Channel adapters are disabled until explicitly configured and verified. Manual entry and CSV import are acceptable MVP paths.

### 7.6 AI assistance and approval
- Generate structured draft proposals grounded in property-specific verified facts and relevant conversation context.
- Label generated drafts as AI-generated until approved.
- Require human approval before guest-facing send actions in MVP.
- Block or escalate questions about unverified rates, availability, transfer schedules, booking confirmation, refunds, cancellations, disputes, safety incidents, government/tax matters, or legal commitments.
- Human takeover pauses automation for the conversation until a permitted user explicitly hands it back.
- Store model/provider, prompt/template version, source fact IDs, validator results, approver, and action result where appropriate.
- Do not log API secrets or unnecessarily retain full sensitive prompts.

### 7.7 Tasks and guest journey
- Tasks have property, title, description, status, priority, assignee, due date, creator, comments, and completion metadata.
- Journey events may represent enquiry, pre-arrival, arrival, during-stay, checkout, review request, and repeat-guest follow-up.
- Automated messages remain disabled unless a channel, consent/legal basis, property content, timing rules, and human override are configured and tested.

### 7.8 Reviews and marketing content
- Track review source, URL/reference, rating, text, date, response status, and assigned reviewer.
- AI may draft a response but cannot publish without approval in MVP.
- Content calendar supports draft, review, approved, scheduled (only where supported), published, and failed states.
- Clearly distinguish manually marked publication from integration-confirmed publication.

### 7.9 Reports and integrations
- Property and agency reports show defined counts and date ranges; no metric may be presented without a documented calculation.
- CSV export must be permission checked, scoped, and audited.
- Integrations show `not_configured`, `pending_authorization`, `connected`, `degraded`, `expired`, or `disconnected`; “connected” requires a successful verification call.
- First release may use manual/CSV workflows. Do not claim live Booking.com, Agoda, WhatsApp, Google Business Profile, PMS, MGIS, or MIRA connectivity until built, authorized, tested, and enabled.

### 7.10 Owner portal
- Property-scoped dashboard, property profile, approved knowledge, assigned tasks, enquiries/conversation visibility where granted, review/content approvals, and reports.
- Owner portal must not expose agency-wide data, other properties, other owners, internal secrets, or private agency notes unless explicitly authorized.

## 8. UI and accessibility

Follow `UI_SPEC.md` and `INTERFACE_SCREENS_AND_WORKFLOWS.md`. The visual direction is a clean premium SaaS dashboard: light workspace, navy sidebar, teal accent, readable type, consistent spacing, clear tables/cards, responsive layouts, and accessible focus states. Every data-driven screen needs loading, empty, error, success, and permission-denied states as applicable. Do not rely on screenshots or image-capable models; the written specification is the source of truth.

## 9. Success metrics

- Median first-response time (only where timestamps exist).
- Number and age of unanswered enquiries.
- Follow-up completion rate.
- Draft approval/edit/rejection rate.
- Human takeover frequency and reasons.
- Task completion and overdue rates.
- Review response rate where publication status is verifiable.
- Integration success/failure rate.
- Active properties and active users.
- Customer retention and willingness to pay.
- Estimated hours saved must be labelled as an estimate and disclose its method.

## 10. MVP acceptance gates

A release candidate is not accepted until: RLS tests prove tenant isolation; role/permission tests pass; AI unknown-answer tests do not hallucinate; all guest-facing sends require approval; human takeover stops automation; audit events exist for high-risk changes; critical journeys work on mobile and desktop; error/retry states are usable; secrets are server-only; backups and recovery are documented; legal/privacy review is completed for the operating entity and jurisdictions; and deployment smoke tests pass.

## 11. Rollout

- **Validation:** interview guesthouses, manually test workflows, confirm willingness to pay.
- **Pilot:** 3–5 properties with manual/CSV operations and human approval.
- **MVP:** agency and owner workspaces, property knowledge, enquiry CRM, drafts/approval, tasks, scanner findings, reports, audit, and tenant-safe data model.
- **Integration expansion:** prioritize based on pilot evidence, partner access, API availability, and maintenance cost.

## 12. Open product decisions

Before production, the product owner must explicitly decide: operator legal entity and contact details; target retention periods; hosting/data-region requirements; exact pilot channel(s); whether owners can view conversations; pricing and billing workflow; support/SLA commitments; AI provider and data-processing terms; and which external integrations are authorized. These are decisions to resolve, not permission to invent values.
