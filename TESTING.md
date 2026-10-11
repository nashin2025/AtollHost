# AtollHost Testing Strategy

## 1. Testing principles

Test business rules and access boundaries, not only whether pages render. Tenant isolation, approval enforcement, truthful integration status, and AI grounding are release-blocking requirements. Use synthetic data only.

## 2. Test layers

1. **Static:** TypeScript, lint, formatting, dependency/security scanning.
2. **Unit:** validators, state transitions, metric calculations, date/time behavior, CSV safety, permission helpers.
3. **Component:** form validation, loading/empty/error states, keyboard operation, approval UI, takeover indicator.
4. **Service/API:** authentication, authorization, schema validation, idempotency, error mapping, provider adapter contracts.
5. **Database/RLS:** tests executed under distinct user identities and roles; verify both allowed and denied operations.
6. **End-to-end:** core journeys on desktop and mobile viewports.
7. **Operational:** migration rehearsal, backup/restore, deployment smoke tests, provider timeout/failure handling.

## 3. Required security tests

- Unauthenticated user cannot read/write tenant records.
- Member of organization A cannot read/write organization B records.
- Owner assigned to property A cannot read/write property B, even by guessing UUIDs or changing payload IDs.
- Revoked user loses access; invitation tokens are single-use and expire.
- User cannot elevate own role or invite a more privileged role than allowed.
- Storage object policies prevent cross-property attachment access.
- RLS is enabled on every exposed tenant table; no accidental public grants.
- Service-role credentials are absent from client bundles, source control, logs, and test artifacts.

## 4. AI safety tests

- Missing rate/availability/transfer/policy fact: assistant must not invent; it asks for verification or escalates.
- Expired, rejected, draft, or conflicting knowledge is not used as a verified source.
- Prompt injection in guest message or imported web content cannot override system policy or reveal other tenants' facts.
- Draft response includes source knowledge IDs and validator result.
- Guest-facing message cannot execute without approval by an authorized person.
- Editing an approved draft invalidates the prior approval.
- Human takeover prevents scheduled or triggered automation from sending.
- Provider timeout or malformed output does not produce a false success or unvalidated send.
- AI-generated content is clearly labeled until reviewed.

## 5. Integration tests

- Missing credentials show `not_configured`.
- Failed health check cannot show `connected`.
- Expired token shows `expired` and prompts reauthorization.
- Invalid webhook signature is rejected.
- Duplicate webhook event is idempotently ignored or reconciled.
- Provider 429/5xx/timeouts use bounded retry and visible degraded status.
- Unknown outbound result is `outcome_unknown`, not success.
- No integration UI claims Booking.com, Agoda, WhatsApp, Google Business, PMS, MIRA, or MGIS functionality until its adapter has verified tests and authorization.

## 6. Functional acceptance matrix

| ID | Scenario | Expected result |
|---|---|---|
| AT-01 | Create organization and property | Membership and property are created atomically and audit is written |
| AT-02 | Invite operator | Token expires, is single-use, and grants only permitted role |
| AT-03 | Create Scanner run | Run status and findings are persisted; findings do not overwrite verified facts |
| AT-04 | Approve knowledge fact | Version, reviewer, source, and verification time are recorded |
| AT-05 | Ask question with verified fact | Draft references relevant verified fact IDs |
| AT-06 | Ask unknown availability question | Draft refuses to invent availability and escalates |
| AT-07 | Approve then edit draft | Previous approval becomes invalid |
| AT-08 | Execute without approval | Server blocks action with `APPROVAL_REQUIRED` |
| AT-09 | Take over conversation | Automation pauses until explicit handback |
| AT-10 | Assign/complete task | Correct assignee, due state, and audit history are shown |
| AT-11 | Import duplicate enquiry | Duplicate handling follows documented idempotency rule |
| AT-12 | Export report | Scope and permissions enforced; CSV formula injection neutralized |
| AT-13 | Owner accesses another property | Access denied without leaking record existence |
| AT-14 | Integration health test fails | Status becomes degraded/failed, not connected |
| AT-15 | Provider action times out | Outcome marked unknown; no false success; reconciliation path available |
| AT-16 | Mobile workflow | Primary actions and forms remain usable at narrow viewport |
| AT-17 | Keyboard navigation | Focus order and modal focus behavior are correct |
| AT-18 | Delete/revoke action | Confirmation, permission check, and audit event occur |

## 7. Data fixtures

Create two organizations, at least two properties in one organization, separate agency members, property owner/staff users, verified and expired facts, sample enquiries, conversations, drafts, tasks, and integrations in different states. Fixtures must be fictional and contain no real guest PII or secrets.

## 8. CI release checks

Required CI pipeline: install reproducibly from lockfile → lint → typecheck → unit/component tests → migration/schema checks → RLS/security tests → production build. E2E and restore tests run at appropriate scheduled/release gates. A failure in tenant isolation, approval enforcement, or secret scanning blocks merge/release.

## 9. Bug severity

- **P0:** cross-tenant data exposure, secret leak, unauthorized outbound send, data corruption; stop release and contain immediately.
- **P1:** core workflow unusable, approval/takeover bypass, major access-control failure.
- **P2:** important feature broken with workaround.
- **P3:** minor visual/content issue.

## 10. Test evidence

Record command, environment, commit, pass/fail, and known skips in the release report. Never say “all tests pass” unless they were actually run and passed.
