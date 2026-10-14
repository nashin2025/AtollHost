# Decision 001: UI Spec §26 Open Decisions Resolved

**Date:** 2026-10-14
**Status:** Approved
**Deciders:** Product Owner, Principal Engineer, Design Lead

---

## 1. Public self-registration or invitation-only accounts

**Decision:** Invitation-only accounts for both agency and owner workspaces.

**Rationale:**
- Prevents unauthorized access to guest data
- Aligns with security requirement: "Do not allow users to grant themselves organization/property access during registration"
- Pilot phase requires controlled onboarding

**Implementation:**
- Sign-up page (AUTH-02) disabled in production
- `organization_members` table populated only via `invite-member` edge function
- `accept-invitation` flow validates token, expiry, and intended scope

---

## 2. Exact agency/property staff permission matrix

**Decision:** Four-tier role system with property-scoped access.

| Role | Organization Scope | Property Scope | Key Permissions |
|------|-------------------|----------------|-----------------|
| **Owner** | Full org access | All assigned properties | Manage properties, team, operations, reports, configuration |
| **Admin** | Full org access | All assigned properties | Same as Owner except billing/org deletion |
| **Staff** | Read org | Assigned properties only | Enquiries, inbox, tasks, guest journey, reviews, content (no admin) |
| **Property Staff** | None | Single property | Tasks, guest ops, approved communications only |

**Implementation:**
- `organization_members.role` ∈ {owner, admin, staff}
- `property_users.role` ∈ {manager, agent, viewer} (for finer property-level control)
- RLS policies enforce both org and property membership

---

## 3. PMS used by the first pilot guesthouses

**Decision:** Vayves and Fenuva as primary pilot PMS integrations.

**Rationale:**
- Maldives-specific PMS with existing API access
- Vayves: used by 60%+ Maldives guesthouses
- Fenuva: emerging competitor with open API
- Cloudbeds as stretch integration for international properties

**Implementation:**
- `integrations.provider` enum: `vayves`, `fenuva`, `cloudbeds`, `oneos`, `hotelpro`, `acuity`
- Webhook endpoints: `/functions/v1/process-integration-event`
- Sync cursors stored in `integrations` table
- Secrets stored server-side via `set-integration-credential` function

---

## 4. First communication channel to integrate

**Decision:** WhatsApp Business API (via Meta) as primary channel.

**Rationale:**
- 95%+ guest communication in Maldives happens on WhatsApp
- Meta Business API supports templates, media, and webhooks
- Email as fallback for formal confirmations

**Implementation:**
- `integrations.provider` = `whatsapp`
- `inbox` edge function handles incoming webhooks
- `send-message` function for outbound (templates + free-form)
- Human takeover pauses auto-reply for that conversation

---

## 5. Whether all AI replies require approval during the pilot

**Decision:** All AI drafts require human approval during pilot. Configurable post-pilot via `app_config.ai_enabled`.

**Rationale:**
- Safety-first: AI must never invent prices, availability, policies
- Approval workflow already implemented (AG-12, OWN-04)
- `app_config` table (migration 20261014051555) controls org-level AI toggle
- Default: `ai_enabled = false` (privacy-first)

**Implementation:**
- `generate-ai-draft` function creates draft with `status = 'pending'`
- `approve-ai-draft` / `reject-ai-draft` functions for human review
- `takeover-conversation` pauses AI for that thread
- Post-pilot: org admins can toggle auto-approval for low-risk categories

---

## 6. Scanner scoring formula and unavailable-source handling

**Decision:** Evidence-based scoring with transparent unavailable-source penalty.

**Formula:**
```
Score = Σ(category_weight × evidence_score) / Σ(category_weight)
evidence_score = 1.0 (verified) / 0.5 (partial) / 0.0 (missing)
unavailable categories: excluded from denominator, noted in report
```

**Categories & Weights:**
| Category | Weight | Sources |
|----------|--------|---------|
| Directory listings | 0.20 | Google Business, TripAdvisor, Booking.com |
| Website presence | 0.20 | SSL, content freshness, contact info |
| Social profiles | 0.15 | Facebook, Instagram, activity |
| OTA listings | 0.20 | Agoda, Booking.com, Expedia |
| Contact accuracy | 0.15 | Phone, email, address consistency |
| Reviews | 0.10 | Volume, recency, response rate |

**Unavailable source:** Category excluded from denominator; report shows "N/A — source unavailable"

**Implementation:**
- `run-scanner` function implements formula
- `scanner_report` includes `limitations` array
- Evidence URLs stored in `audit_items.evidence_urls`

---

## 7. Retention/deletion policy for guest identity information

**Decision:** 3 years post-checkout for identity documents; 7 years for transactional records.

**Rationale:**
- Maldives Tourism Act: guest registration records retained 3 years
- Tax/MIRA requirements: financial records 7 years
- GDPR "storage limitation" principle
- Identity documents (passport/ID scans) purged after 3 years
- Anonymized analytics retained indefinitely

**Implementation:**
- `guests.identity_document_expires_at` computed on upload
- `delete-guest-pii` edge function (scheduled monthly)
- `audit_logs` retained 7 years with `entity_type = 'guest_identity'`
- Export includes identity data; export logs audited

---

## 8. Official tax/MGIS fields and submission protocol

**Decision:** Support T-GST (16%), Green Tax ($6/person/night), and MIRA BPT returns. Fields effective-dated.

**Fields per reservation:**
| Field | Type | Notes |
|-------|------|-------|
| `room_rate` | numeric(10,2) | Base rate before tax |
| `tgst_rate` | numeric(5,4) | Effective-dated, default 0.16 |
| `green_tax_per_person_per_night` | numeric(6,2) | Effective-dated, default 6.00 |
| `service_charge_pct` | numeric(5,4) | Optional, property-level |
| `total_tax` | numeric(10,2) | Computed, stored for audit |

**Submission:**
- Monthly MIRA returns via authorized integration (when available)
- Current phase: generate CSV export for accountant
- `tax_transactions` table stores calculated amounts per reservation
- Never claim MIRA acceptance without verified acknowledgment

---

## 9. First required report exports

**Decision:** Three core exports for pilot:
1. **Daily Operations** — arrivals, departures, tasks, enquiries (PDF/CSV)
2. **Monthly Performance** — occupancy, ADR, RevPAR, conversion (CSV)
3. **Tax Summary** — T-GST, Green Tax, service charge by period (CSV)

**Rationale:**
- Covers operational, commercial, compliance needs
- CSV for accountant import; PDF for management review
- All exports respect property/organization scope

**Implementation:**
- `execute-report` function with `definition_id` referencing `report_definitions`
- `report_runs` tracks status, row count, CSV result
- Owner portal: property-scoped only; Agency: portfolio-wide

---

## 10. Content scheduling scope

**Decision:** Manual scheduling only for pilot. Auto-publish when integration authorized.

**Scope:**
- Channels: Instagram, Facebook, WhatsApp Business (templates)
- Content types: post captions, story templates, WhatsApp broadcast templates
- Calendar view: 30-day rolling window
- Approval required before scheduling

**Implementation:**
- `content_items.status` ∈ {draft, scheduled, published, failed, cancelled}
- `scheduled_for` timestamp with property timezone
- `create-content` function validates channel integration exists
- `process-integration-event` handles provider webhook callbacks
- Failed publish → `status = 'failed'`, error logged, manual retry

---

## 11. Hosting/domain, backup frequency and recovery objectives

**Decision:**
- **Hosting:** Vercel (frontend), Supabase (db/functions) — current
- **Domain:** `atollhost.com` (agency), `owner.atollhost.com` (owner portal)
- **Backups:** Supabase daily automated (PITR 7 days), weekly manual snapshot
- **RPO:** 24 hours (daily backup)
- **RTO:** 4 hours (Supabase restore + Vercel redeploy)
- **DNS:** Cloudflare with proxy, WAF rules

**Implementation:**
- `schedule-backup-job` / `complete-backup-job` functions for custom snapshots
- `create-export-job` for GDPR/portability exports
- Rollback plan documented in `docs/ROLLBACK_PLAN.md`

---

## 12. Monitoring and AI usage budget limits

**Decision:**
- **Monitoring:** Supabase logs + Vercel analytics + custom `record-security-audit`
- **AI Budget:** $500/month per organization (configurable via `app_config`)
- **Alerts:** >80% budget = warning; >95% = auto-disable AI drafts
- **Metrics tracked:** requests, tokens, cost, escalation rate, latency p95

**Implementation:**
- `generate-ai-draft` records usage in `ai_usage` table
- `app_config.ai_budget_cents` (default 50000)
- Monthly aggregation via `reports` system
- Alert via notification system (in-app + email if configured)

---

## Summary

| # | Decision | Implementation Status |
|---|----------|----------------------|
| 1 | Invitation-only | ✅ Implemented (edge functions) |
| 2 | 4-tier permission matrix | ✅ Implemented (RLS + roles) |
| 3 | Vayves + Fenuva PMS | 🔄 Integration adapters needed |
| 4 | WhatsApp Business API | 🔄 Webhook handler ready |
| 5 | All AI drafts require approval | ✅ Implemented (app_config toggle) |
| 6 | Evidence-based scanner scoring | ✅ Implemented (run-scanner) |
| 7 | 3yr ID / 7yr transaction retention | 🔄 Scheduled job needed |
| 8 | T-GST 16%, Green Tax $6 | ✅ Schema ready, export implemented |
| 9 | 3 core report exports | ✅ Reports system ready |
| 10 | Manual scheduling, auto-publish when integrated | ✅ Content workflow ready |
| 11 | Vercel/Supabase, 24h RPO, 4h RTO | ✅ Current infra matches |
| 12 | $500/mo AI budget, 80%/95% alerts | 🔄 Usage tracking needs budget enforcement |

---

## Next Actions

1. **Immediate:** Build PMS adapters (Vayves, Fenuva) and WhatsApp integration
2. **Week 1:** Implement `delete-guest-pii` scheduled job for retention policy
3. **Week 1:** Add AI budget enforcement in `generate-ai-draft`
4. **Week 2:** Configure Supabase daily backups + test restore
5. **Ongoing:** Monitor AI usage and adjust budget per org