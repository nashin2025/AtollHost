# AtollHost Pilot Onboarding Guide

## Overview
This guide walks pilot property owners and operators through the AtollHost onboarding process, from initial setup to going live.

## Prerequisites
- Supabase project access (provided by AtollHost team)
- Property ownership verification documents
- Team member emails for invitations
- Existing property knowledge (FAQs, policies, check-in/out times, etc.)

## Step 1: Organization Setup
1. **Create Organization**
   - Navigate to `/onboarding`
   - Enter organization name and slug
   - System creates organization and assigns you as `agency_admin`

2. **Invite Team Members**
   - Go to Settings → Team
   - Click "Invite Member"
   - Enter email and select role:
     - `agency_staff` - organization-level staff
     - `property_owner` - full property access
     - `property_manager` - operational access
     - `property_staff` - limited operational access
   - Invitations expire in 72 hours

## Step 2: Property Configuration
1. **Create Property**
   - Click "Add Property" in dashboard
   - Enter property details:
     - Name, island, atoll, country
     - Timezone (default: Indian/Maldives)
     - Currency (default: MVR)
     - Contact info (phone, email, address)
   - Property starts in `onboarding` status

2. **Assign Team to Property**
   - Go to Property → Team
   - Click "Add Member"
   - Select user and role (`property_owner`, `property_manager`, `property_staff`)
   - Grant owner access via Settings → Owner Access

## Step 3: Knowledge Base (Property Brain)
1. **Create Categories**
   - Go to Brain → Categories
   - Create categories: Check-in/out, Amenities, Policies, Local Area, Emergency

2. **Add Knowledge Facts**
   - Click "Add Fact"
   - Enter title, content, category
   - Set source: `manual`, `scanner`, or `import`
   - Facts start as `draft` → submit for review → `approved`

3. **Review & Approve**
   - Approved facts become available for AI drafts
   - Only `property_owner`/`property_manager` can approve

## Step 4: Enquiries & Inbox
1. **Configure Channels**
   - Supported: website, booking, walk_in, phone, email, messaging, other
   - Set up webhook endpoints for external channels

2. **Test Conversation Flow**
   - Create test conversation from Enquiries page
   - Send test messages as guest/human
   - Test human takeover/handback

## Step 5: AI Draft Pipeline
1. **Configure AI Provider**
   - Set secrets in Supabase dashboard:
     - `AI_PROVIDER_URL` (e.g., https://integrate.api.nvidia.com/v1)
     - `AI_PROVIDER_API_KEY`
     - `AI_MODEL` (e.g., nvidia/nemotron-3-nano-omni-30b-a3b-reasoning)

2. **Test AI Drafts**
   - Open conversation in Inbox
   - Click "AI Draft" button
   - Review draft, confidence, sources
   - Approve → sends as AI message
   - Reject or edit as needed

3. **Policy Validation**
   - AI drafts checked for: unsupported facts, sensitive topics, prompt injection, action boundaries
   - Blocked drafts show policy warnings

## Step 6: Tasks & Guest Journey
1. **Create Tasks**
   - Go to Tasks page
   - Create tasks with due dates, priorities, assignees
   - Add comments, attachments

2. **Configure Guest Journey**
   - Use Journey Templates (admin only)
   - Trigger types: reservation.created, check_in, check_out, review_request
   - Configure automation (default off until approved)

## Step 7: Reviews & Content
1. **Review Responses**
   - New reviews appear in Reviews page
   - AI drafts generated for responses
   - Approve/publish or reject

2. **Content Calendar**
   - Schedule content (website, email, social)
   - Track manual vs integration publication
   - Export when needed

## Step 8: Integrations
1. **Add Integration**
   - Go to Integrations page
   - Select provider (Booking.com, Airbnb, etc.)
   - Set auth type (API key, OAuth2, etc.)
   - Add credentials via Set Credential

2. **Configure Webhooks**
   - Add webhook URL and events
   - Set secret hash for HMAC verification
   - Test with Record Integration Event endpoint

3. **Health Monitoring**
   - Health checks run every 5 minutes
   - View health history in Integrations page
   - Set up alerts for degraded/unhealthy

## Step 9: Owner Portal
1. **Grant Owner Access**
   - Admin grants access via Owner Access page
   - Configure permissions (revenue, occupancy, reviews, etc.)

2. **Owner Dashboard**
   - Owner logs in and sees property dashboard
   - Revenue, occupancy, enquiries, reviews, tasks, knowledge

## Step 10: Security & Compliance
1. **Schedule Audits**
   - Dependency scan, secrets scan, backup restore, privacy review
   - Set severity and schedule
   - Track findings and remediation

2. **Backup Jobs**
   - Schedule full/incremental backups
   - Monitor backup status and storage

## Support & Incident Process

### Support Channels
- **Email**: support@atollhost.com
- **In-app**: Help button → Contact Support
- **Slack**: #atollhost-support (pilot participants)

### Incident Severity
- **P0 - Critical**: System down, data loss, security breach
  - Response: 15 min, Resolution: 2 hours
- **P1 - High**: Major feature broken, significant user impact
  - Response: 1 hour, Resolution: 8 hours
- **P2 - Medium**: Minor feature issue, workaround exists
  - Response: 4 hours, Resolution: 24 hours
- **P3 - Low**: Cosmetic, documentation, enhancement
  - Response: 24 hours, Resolution: 1 week

### Incident Response
1. **Detect**: Monitoring alert or user report
2. **Acknowledge**: Assign owner, set severity
3. **Investigate**: Check logs, reproduce, identify root cause
4. **Resolve**: Deploy fix, verify, communicate
5. **Postmortem**: Document within 48 hours for P0/P1

### Escalation
- P0/P1: Page on-call engineer immediately
- P2: Assign during business hours
- P3: Next sprint planning

## Go-Live Checklist
- [ ] Organization created and team invited
- [ ] Property created and team assigned
- [ ] Knowledge base populated (min 20 approved facts)
- [ ] Enquiry channels configured
- [ ] AI drafts tested and working
- [ ] Tasks and guest journey configured
- [ ] Reviews and content calendar set up
- [ ] Integrations added and tested
- [ ] Owner access granted
- [ ] Security audits scheduled
- [ ] Backup jobs configured
- [ ] Team trained on all workflows
- [ ] Support contacts documented

## Pilot Feedback
- Weekly check-ins with AtollHost team
- Feedback form in app (Help → Feedback)
- Feature requests tracked in GitHub
- Weekly sync call (30 min)

## Contacts
- **Product**: product@atollhost.com
- **Engineering**: eng@atollhost.com
- **Security**: security@atollhost.com
- **Emergency**: +1-XXX-XXX-XXXX (P0 only)