# AtollHost Pilot Verification Checklist

## Pre-Pilot Verification (Before Inviting Pilot Properties)

### Infrastructure
- [ ] Supabase project `atollhost-dev` accessible
- [ ] All 19 migrations applied successfully
- [ ] All 48 edge functions deployed and ACTIVE
- [ ] AI provider secrets configured (URL, API_KEY, MODEL)
- [ ] SUPABASE_ACCESS_TOKEN configured for CI/CD
- [ ] Vercel deployment connected to main branch
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates valid

### Database
- [ ] All 19 migrations applied (verify with `supabase migration list`)
- [ ] RLS policies active on all tables (verify with `supabase/tests/rls_cross_tenant_checks.sql`)
- [ ] Materialized views `mv_property_performance` and `mv_agent_performance` created
- [ ] System report definitions seeded
- [ ] Indexes created on all foreign keys and query patterns

### Edge Functions
- [ ] All 48 functions deployed and ACTIVE
- [ ] AI provider secrets set (AI_PROVIDER_URL, AI_PROVIDER_API_KEY, AI_MODEL)
- [ ] Function logs accessible in Supabase Dashboard
- [ ] Function timeouts configured (15s default for AI)

### Security
- [ ] RLS policies enforced on all tables
- [ ] No authenticated user can access cross-tenant data
- [ ] Service role only used in edge functions
- [ ] Integration credentials encrypted (pgcrypto)
- [ ] Webhook secrets hashed (not stored plaintext)
- [ ] Audit logs writing for all privileged operations

### Monitoring
- [ ] Integration health checks running (5 min interval)
- [ ] Error logging in Supabase function logs
- [ ] Application error boundary capturing frontend errors
- [ ] Backup jobs schedulable

---

## Pilot Property Onboarding (Per Property)

### Organization Setup
- [ ] Organization created with correct name/slug
- [ ] Owner invited and accepted invitation
- [ ] Team members invited with correct roles
- [ ] Property created with correct details
- [ ] Property team assigned with correct roles

### Knowledge Base
- [ ] Categories created (min 5)
- [ ] Facts added (min 20 total)
- [ ] Facts reviewed and approved (all facts must be approved for AI)
- [ ] Fact categories cover: check-in/out, amenities, policies, local area, emergency

### Enquiries & Inbox
- [ ] Channel configurations match property channels
- [ ] Test conversation created and messages sent
- [ ] Human takeover/handback tested
- [ ] Attachment upload tested (image, PDF)

### AI Draft Pipeline
- [ ] AI provider secrets verified working
- [ ] AI draft generation tested (min 5 test drafts)
- [ ] Policy validation working (test blocked drafts)
- [ ] Approve/reject/edit workflow tested
- [ ] Version hash binding verified (edit after approve rejected)

### Tasks & Guest Journey
- [ ] Task creation with due dates, priorities, assignees
- [ ] Task comments and mentions working
- [ ] Journey template created (admin)
- [ ] Guest journey event timeline visible

### Reviews & Content
- [ ] Review response AI draft tested
- [ ] Approve/publish/reject workflow tested
- [ ] Content calendar entry created (manual source)
- [ ] Content calendar entry created (integration source)
- [ ] Export job created and completed (CSV)

### Integrations
- [ ] Test integration created (sandbox mode)
- [ ] Credentials set and verified
- [ ] Webhook endpoint configured
- [ ] Test event recorded and processed
- [ ] Health check runs and shows healthy
- [ ] Rate limiting tested (429 response)

### Owner Portal
- [ ] Owner property access granted with permissions
- [ ] Owner dashboard loads with correct data
- [ ] Granular permissions tested (revoke revenue access, verify hidden)

### Security & Compliance
- [ ] Security audit scheduled (dependency scan)
- [ ] Backup job scheduled and completed
- [ ] Owner notifications configured
- [ ] Owner portal branding configured

---

## Pilot Program Execution

### Week 1: Onboarding
- [ ] Day 1: Organization setup, team invites
- [ ] Day 2: Property creation, knowledge base
- [ ] Day 3: Enquiries/Inbox, AI drafts
- [ ] Day 4: Tasks, guest journey, reviews
- [ ] Day 5: Integrations, owner portal, security

### Week 2: Active Use
- [ ] Daily active use by all team members
- [ ] Enquiries processed through inbox
- [ ] AI drafts used for guest responses
- [ ] Tasks created and completed
- [ ] Reviews responded to
- [ ] Content scheduled/published
- [ ] Integrations receiving events

### Week 3: Stress Test
- [ ] High volume enquiry simulation
- [ ] Multiple concurrent AI drafts
- [ ] Concurrent task operations
- [ ] Integration event burst test
- [ ] Export job with large dataset

### Week 4: Feedback & Stabilization
- [ ] Collect feedback from all users
- [ ] Document bugs and UX issues
- [ ] Performance profiling
- [ ] Security audit review

---

## Go/No-Go Criteria

### Must Pass (All Required)
- [ ] All 106 tests passing
- [ ] All 60+ RLS assertions passing
- [ ] All 48 edge functions ACTIVE
- [ ] Zero P0/P1 bugs in pilot
- [ ] Data integrity verified (no orphaned records)
- [ ] RLS cross-tenant isolation verified
- [ ] AI draft approval binding verified
- [ ] Export data matches source records
- [ ] Owner permissions enforced correctly
- [ ] Backup/restore tested

### Should Pass (Target 90%+)
- [ ] AI draft acceptance rate > 70%
- [ ] Task completion rate > 80%
- [ ] Review response time < 24 hours
- [ ] Integration health > 99% uptime
- [ ] Export generation < 30 seconds
- [ ] Page load times < 2 seconds

### Nice to Have
- [ ] Mobile responsive layout verified
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance budget met (< 200ms API p95)
- [ ] Support documentation complete

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering Lead | | | |
| Product Owner | | | |
| Security Lead | | | |
| Pilot Property Owner | | | |
| Pilot Property Manager | | | |

## Notes
________________________________________________________________________
________________________________________________________________________
________________________________________________________________________