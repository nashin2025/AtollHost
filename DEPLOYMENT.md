# AtollHost Deployment and Operations

## 1. Environments

Maintain separate Supabase projects and credentials for development, staging, and production. Production guest data must not be copied into development. Restrict production access to named operators and audit privileged changes.

## 2. Prerequisites

- Maintained Node.js LTS and npm.
- Git repository and protected main branch.
- Supabase project with Auth, PostgreSQL, Storage, and Edge Functions enabled as required.
- Chosen frontend host supporting SPA routing, HTTPS, environment variables, and rollback/deploy history.
- Server-side secrets configured for AI and enabled integrations only.
- DNS/domain and email delivery configuration if production authentication needs email.

## 3. Environment variables

Frontend variables may contain only public client configuration such as the Supabase project URL and anon/publishable key. Names depend on the repository, commonly `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never expose service-role keys, AI provider keys, OAuth client secrets, refresh tokens, signing keys, or database passwords via `VITE_*`.

Server/Edge Function secrets should be stored in the provider's secret manager, not committed to `.env` files. Use separate keys for each environment and rotate immediately if exposed.

## 4. First deployment sequence

1. Review current repository and package scripts.
2. Install dependencies from lockfile and run lint/typecheck/tests/build.
3. Create the Supabase environment and configure Auth redirect URLs, allowed origins, email settings, and storage policies.
4. Review every migration, especially RLS and `SECURITY DEFINER` functions. Apply to development first.
5. Run RLS/tenant-isolation tests using multiple user identities.
6. Deploy Edge Functions and configure secrets; test provider calls in sandbox/staging.
7. Build frontend and deploy to staging with SPA fallback routing and HTTPS.
8. Run the full smoke-test checklist, including unauthorized access and AI approval tests.
9. Back up production data, apply reviewed migrations during an approved window, deploy app, and run smoke tests.
10. Monitor errors, failed jobs, provider health, latency, and access denials.

Use the exact commands supported by the repository's package scripts and installed Supabase CLI version; do not blindly run a guessed command against production.

## 5. Database migrations

- Review SQL diffs and estimate locks/backfill duration.
- Never edit a migration already applied to a shared/production database; create a new migration.
- Apply migrations to a disposable/staging project first.
- Confirm RLS enabled and policies present after each migration.
- Use additive changes before destructive changes; backfill and verify before dropping columns.
- Keep a recovery plan and tested backup before risky migration.

## 6. PWA and frontend

- Serve over HTTPS.
- Configure SPA fallback to `index.html` for application routes.
- Cache only safe static assets; do not cache private API responses or sensitive pages in a shared service-worker cache.
- Avoid offline mutation queues for outbound sends until conflict, approval expiry, and idempotency are correctly designed.
- Include accessible install guidance only after manifest/icons/service worker are correctly configured.

## 7. Secrets and integrations

Set server secrets only for integrations actually enabled. Verify OAuth redirect URI, scope, state/nonce, signature validation, token refresh, revocation, and provider sandbox behavior. Use least privilege. Do not enable live guest-facing automation by default.

## 8. Backup and recovery

Define RPO/RTO with the operator before launch. Confirm database backup schedule and retention with the hosting plan. Back up required storage metadata/assets where applicable. Perform a restore drill to a separate project before production launch and periodically thereafter. Document who can initiate restore and how to verify recovered data. A backup that has never been restored is not proven recovery.

## 9. Monitoring and incidents

Alert on sustained 5xx rates, failed scheduled jobs, repeated provider errors, suspicious authorization failures, database/storage quota, backup failure, and elevated AI latency/cost. Maintain an incident runbook: contain, preserve relevant logs, revoke/rotate credentials, assess affected tenants/data, restore service, notify appropriate parties as required, and document lessons learned.

## 10. Rollback

- Frontend: redeploy last known-good artifact.
- Edge Functions: redeploy prior tested version if compatible with current schema.
- Database: prefer forward-fix; use restore only with a reviewed data-loss impact. Do not assume down migrations are safe.
- Disable an integration/automation before rollback if it risks duplicate or unsafe outbound actions.

## 11. Production go/no-go

Do not launch until security/RLS tests, approval/takeover tests, privacy and terms review, backup/restore drill, smoke tests, monitoring, support ownership, and release sign-off are complete. External integration and regulatory capabilities must be described accurately and must not be advertised as live unless verified.
