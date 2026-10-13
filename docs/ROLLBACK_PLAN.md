# AtollHost Rollback Plan - v1.0.0-pilot

## Overview
This document describes the rollback procedures for the AtollHost v1.0.0-pilot release.

## Rollback Triggers
- **Automatic**: P0 incident (system down, data loss, security breach) unresolved > 2 hours
- **Manual**: Product Owner decision based on:
  - Critical regression affecting all pilot properties
  - Data integrity issue
  - Security vulnerability actively exploited
  - Performance degradation > 50% baseline

## Rollback Procedures

### 1. Application Rollback (Frontend)
**Time**: ~5 minutes
**Command**:
```bash
# Deploy previous Vercel deployment
vercel rollback <deployment-url>
```
Or via Vercel Dashboard → Deployments → Previous deployment → Promote to Production

**Verification**:
- [ ] Application loads at production URL
- [ ] Auth flow works (sign in/out)
- [ ] Core pages load (Overview, Properties, Inbox, Brain)
- [ ] No console errors

### 2. Database Rollback (Migrations)
**Time**: ~15 minutes
**Risk**: Data loss for migrations after rollback point

#### Option A: Supabase Point-in-Time Recovery (Preferred)
```bash
# In Supabase Dashboard → Database → Backups
# Select restore point before problematic migration
# Initiate restore (takes ~10-15 min)
```

#### Option B: Manual Migration Reversion
```bash
# Mark migration as reverted
supabase migration repair --status reverted <migration-timestamp>

# Apply down migration manually (if available)
# Or restore from pg_dump backup
pg_restore -d <db_url> backup.dump
```

**Critical Migrations (Do Not Revert Without Data Backup)**:
- 0001_initial_schema (base schema)
- 0007_phase2_identity_lifecycle (auth/org structure)
- 0014_phase6_ai_drafts (AI drafts with approvals)
- 0015_phase7_tasks_journey_reviews_content (tasks/reviews/content)

**Safe to Revert** (additive features):
- 0017_phase8_reports_exports
- 0018_phase9_integrations
- 0019_phase10_owner_portal

### 3. Edge Functions Rollback
**Time**: ~3 minutes per function
```bash
# Deploy previous version
supabase functions deploy <function-name> --project-ref <ref>
# Or use Supabase Dashboard → Functions → Deploy previous version
```

**Priority Order for Rollback**:
1. Critical: send-message, generate-ai-draft, approve-ai-draft
2. High: start-conversation, send-message, upsert-enquiry
3. Medium: create-task, create-content, execute-report
4. Low: create-integration-webhook, get-owner-dashboard

### 4. Secrets Rollback
```bash
# Revert to previous secret values
supabase secrets set AI_PROVIDER_API_KEY=<previous-key>
supabase secrets set AI_MODEL=<previous-model>
```
Verify in Supabase Dashboard → Settings → Edge Functions → Secrets

### 5. DNS/CDN Rollback
If using custom domain:
```bash
# Vercel: revert to previous deployment (includes DNS)
# Cloudflare: revert DNS records to previous target
```

## Rollback Decision Matrix

| Scenario | Rollback Scope | Estimated Time | Approval Required |
|----------|---------------|----------------|-------------------|
| Frontend regression | Frontend only | 5 min | Tech Lead |
| Edge function bug | Single function | 3 min | Tech Lead |
| Multiple function bugs | Multiple functions | 10 min | Engineering Lead |
| Migration issue | Database + functions | 15-30 min | Engineering Lead + Product Owner |
| Data corruption | Full DB restore | 30-60 min | Engineering Lead + Product Owner + Security |
| Security breach | Full rollback + secrets | 30 min | Security Lead + Engineering Lead |

## Post-Rollback Verification

### Automated Checks
```bash
# Run test suite
npm run test
# Run lint/typecheck
npm run lint && npm run typecheck
# Build verification
npm run build
```

### Manual Smoke Tests
- [ ] Sign in/out flow
- [ ] Create organization → invite member → accept invitation
- [ ] Create property → assign team
- [ ] Create knowledge fact → review → approve
- [ ] Create enquiry → start conversation → send messages
- [ ] Generate AI draft → approve → verify role='ai' message
- [ ] Create task → update → comment
- [ ] Create content → schedule → publish
- [ ] Create integration → set credential → test webhook
- [ ] Owner dashboard loads with data
- [ ] Security audit can be recorded
- [ ] Backup job can be scheduled

### Data Integrity Checks
```sql
-- Verify critical tables have data
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM properties;
SELECT COUNT(*) FROM knowledge_items WHERE status = 'approved';
SELECT COUNT(*) FROM conversation_messages WHERE role = 'ai';
SELECT COUNT(*) FROM export_jobs;
SELECT COUNT(*) FROM security_audit_log;
```

## Communication Plan

### Internal
- **Slack #atollhost-incidents**: Real-time updates
- **Email**: engineering@atollhost.com (detailed postmortem within 24h)

### External (Pilot Participants)
- **In-app banner**: "We're experiencing issues, rolling back. ETA: X minutes"
- **Email**: Pilot participants notified of rollback and expected resolution
- **Status page**: status.atollhost.com updated

### Post-Rollback
1. **Incident Postmortem** (within 48 hours for P0/P1):
   - Root cause analysis
   - Timeline
   - Action items with owners
   - Prevention measures

2. **Fix & Re-release**:
   - Fix root cause in hotfix branch
   - Run full test suite
   - Deploy to staging
   - Staging smoke tests
   - Re-deploy to production

3. **Update Documentation**:
   - Update runbooks if needed
   - Update rollback plan if gaps found

## Contact Information

| Role | Contact | Escalation |
|------|---------|------------|
| Engineering Lead | eng@atollhost.com | Primary |
| Product Owner | product@atollhost.com | Business decision |
| Security Lead | security@atollhost.com | Security incidents |
| On-call Engineer | +1-XXX-XXX-XXXX | P0/P1 after hours |

## Approval
- **Engineering Lead**: _________________ Date: _______
- **Product Owner**: _________________ Date: _______
- **Security Lead**: _________________ Date: _______