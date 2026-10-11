# AtollHost Security Requirements

## 1. Security objectives

Protect guest and business information; prevent cross-tenant access; ensure only authorized users can approve or execute actions; keep provider secrets server-side; make critical actions auditable; and fail safely when AI or integrations are uncertain.

## 2. Threat model

Protect against: broken object-level authorization, malicious/compromised tenant users, privilege escalation, stolen sessions, prompt injection through guest messages or web content, AI hallucinations, leaked API keys, malicious uploads, CSV formula injection, SSRF through scanner/import features, webhook spoofing/replay, duplicate external sends, dependency compromise, and accidental exposure through logs/backups.

## 3. Authentication and authorization

- Use Supabase Auth with verified redirect URLs and secure session handling.
- Enforce organization membership and property assignment on every read/write.
- Enable RLS on every exposed tenant table and storage bucket; default deny.
- Re-check authorization inside Edge Functions for every privileged action.
- Never trust role, organization, property, approval, or sender fields supplied by the browser.
- Invitation tokens must be random, single-use, expiring, stored safely, and bound to expected recipient/policy.
- Revocation must invalidate access promptly and be tested.
- Admin/service-role access is restricted to server-side code and operations personnel.

## 4. Database security

- Least-privilege grants and explicit RLS policies.
- Foreign keys and constraints ensure parent/tenant ownership agrees.
- Review `SECURITY DEFINER` functions; set fixed `search_path`, restrict execute grants, avoid dynamic SQL where possible.
- Never disable RLS to make a feature work without an approved design and compensating controls.
- Automated negative tests cover each tenant-owned table and storage object class.

## 5. AI security and action safety

- Treat guest input, scraped content, uploaded documents, and imported messages as untrusted data.
- System policy and application rules cannot be overridden by user-provided prompt text.
- Retrieve only verified, unexpired, property-scoped facts.
- Validate structured output and escape/render untrusted text safely.
- Never let the model directly choose arbitrary URLs, SQL, code execution, permissions, or unbounded tools.
- Require human approval for guest-facing sends in MVP; approval is bound to exact draft version/hash.
- Human takeover blocks automation until explicit handback.
- High-risk/unknown topics escalate; do not invent availability, rates, transfers, refunds, legal or tax advice.
- Record provenance, validator decisions, approval, and verified execution result without storing unnecessary sensitive prompts.

## 6. Secrets and encryption

- Use managed secret storage for AI/API keys, OAuth secrets, webhook secrets, and service-role credentials.
- Never expose privileged secrets in frontend bundles, `VITE_*` variables, repository, client logs, screenshots, or error messages.
- Encrypt transport with HTTPS/TLS. Verify at-rest encryption and key management with the chosen providers before making public claims.
- Rotate credentials after exposure or staff/provider changes; document rotation steps.

## 7. Input, file, and scanner safety

- Validate and normalize all user inputs server-side.
- Limit file size/type; verify MIME by content where feasible; store private files with scoped signed access; scan files where supported.
- Prevent CSV formula injection in exports.
- Protect scanner/fetch endpoints against SSRF: allow only supported schemes, block loopback/private/link-local/metadata IPs, revalidate DNS and redirects, set timeouts/size limits, and restrict destinations where possible.
- Respect site terms, robots directives, rate limits, and access controls; do not bypass authentication or anti-bot controls.
- Sanitize HTML and render imported content as text unless safely sanitized.

## 8. Integrations and webhooks

- Verify webhook signatures and timestamps before processing.
- Deduplicate by provider event ID/idempotency key.
- Use minimal OAuth scopes and validate state/nonce/redirect URIs.
- Do not mark action successful until verified provider response is recorded.
- On uncertain timeout, reconcile before retrying a non-idempotent send.
- Redact tokens and sensitive payloads from logs.

## 9. Logging, monitoring, and incident response

Log actor, scope, action, outcome, time, and correlation ID for critical events. Avoid full message bodies, secrets, access tokens, and unnecessary personal data in logs. Alert on cross-tenant authorization failures, unusual export volume, secret exposure, repeated login failures, provider errors, and failed backups. Maintain a response process for containment, credential rotation, evidence preservation, impact assessment, required notification, recovery, and post-incident review.

## 10. Privacy and retention

Minimize collected data. Define retention and deletion per data category. Protect exports and attachments with access controls and expiry. Test deletion and access revocation. Backups and audit logs may need separate retention rules; disclose them accurately.

## 11. Release security gates

Block production release for any unresolved critical/high issue involving tenant isolation, authentication, secret exposure, approval bypass, unsafe outbound automation, webhook verification, or data corruption. Run dependency scanning, secret scanning, RLS tests, authorization tests, and backup/restore checks.

## 12. Security checklist

- [ ] RLS enabled on every exposed tenant table and storage bucket.
- [ ] Cross-tenant and cross-property negative tests pass.
- [ ] Privileged functions verify auth and role server-side.
- [ ] No secrets in client bundles or repository.
- [ ] AI output is validated and human-approved before send.
- [ ] Takeover blocks automation.
- [ ] Webhook signature and replay protections are tested.
- [ ] Scanner SSRF protections are tested.
- [ ] Exports prevent formula injection and enforce scope.
- [ ] Backups and restore have been exercised.
- [ ] Incident contact and runbook are assigned.
