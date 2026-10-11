# AtollHost Architecture and Product Decisions

Record material decisions here using: **ID, date, status, context, decision, consequences, owner**. Update rather than silently contradict earlier choices.

## Accepted baseline decisions

### ADR-001 — Product boundary
- **Status:** Accepted
- **Decision:** AtollHost is a guesthouse digital-operations layer, not a full PMS, channel manager, booking engine, POS, or accounting system.
- **Consequence:** MVP focuses on property knowledge, enquiries, AI drafts/approval, tasks, reviews/content, reports, and integration health.

### ADR-002 — Multi-tenant model
- **Status:** Accepted
- **Decision:** One agency organization can manage multiple properties; owners and staff receive explicit property-scoped access.
- **Consequence:** PostgreSQL RLS and server-side authorization are release blockers. UI filtering alone is insufficient.

### ADR-003 — Application stack
- **Status:** Accepted baseline
- **Decision:** Responsive PWA using React/TypeScript/Vite and Supabase Auth/PostgreSQL/Storage/Edge Functions.
- **Consequence:** Inspect existing repository before replacing any compatible implementation detail.

### ADR-004 — AI safety
- **Status:** Accepted
- **Decision:** AI creates grounded proposals; guest-facing sends require human approval in MVP. Unknown facts escalate. Human takeover pauses automation.
- **Consequence:** Approval binds to exact draft version; execution is server-side and audited.

### ADR-005 — Integration honesty
- **Status:** Accepted
- **Decision:** Manual/CSV fallback first. An integration is live only after authorization, implementation, testing, and verified provider outcomes.
- **Consequence:** No fake connected/sent/published/submitted state.

### ADR-006 — Text-first implementation specs
- **Status:** Accepted
- **Decision:** Written UI and workflow specifications are authoritative; implementation must not depend on the coding agent interpreting screenshots.
- **Consequence:** Design tokens, screen IDs, states, and journeys are specified in `UI_SPEC.md` and `INTERFACE_SCREENS_AND_WORKFLOWS.md`.

### ADR-007 — Licensing
- **Status:** Accepted default pending owner confirmation
- **Decision:** Repository source and product documentation are proprietary by default; no open-source license is granted by the `LICENSE` file.
- **Consequence:** Do not add third-party assets/dependencies without recording and complying with their licenses.

## Decisions required before production

| ID | Question | Why it matters | Required outcome |
|---|---|---|---|
| D-01 | Which legal entity operates AtollHost? | Contracting, privacy notice, support contact | Approved legal name and contact details |
| D-02 | Which hosting/data region? | Latency, contractual/privacy commitments | Region selected and documented |
| D-03 | Which AI provider/model? | Vision/text capability, data processing, cost, residency | Evaluated provider and signed-off terms |
| D-04 | Retention per data category? | Privacy and storage cost | Approved retention/deletion schedule |
| D-05 | First live channel/integration? | API access and pilot utility | Provider chosen after customer validation |
| D-06 | Can owners see conversations/messages? | Privacy, workflow, permissions | Explicit capability matrix |
| D-07 | What email service sends invitations/reset emails? | Auth deliverability | Verified sender/domain and operational owner |
| D-08 | Backup RPO/RTO and incident owner? | Recovery readiness | Tested operational targets/runbook |
| D-09 | What are pilot pricing and service levels? | Commercial promises | Approved terms and support window |
| D-10 | What tax/tourism/MGIS functions are in scope? | Regulatory risk | Verified official requirements and legal review |
| D-11 | Are data-processing agreements needed with customers/providers? | Contractual obligations | Reviewed agreements and vendor list |
| D-12 | Which accessibility target? | QA acceptance | Adopt WCAG 2.2 AA as target unless formally changed |

Never fill unresolved decisions with invented credentials, addresses, retention promises, API access, or legal status.
