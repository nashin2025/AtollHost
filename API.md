# AtollHost API and Service Contracts

## 1. General rules

The browser should use authenticated Supabase client access for ordinary RLS-protected CRUD. Use Supabase Edge Functions (or equivalent trusted server endpoints) for AI calls, provider secrets, webhooks, privileged exports, token exchange/refresh, and external side effects. The routes below are logical contracts; implement them as Edge Functions or typed service modules according to the repository, and do not expose fake endpoints.

- Base path convention: `/functions/v1/<function-name>` for Edge Functions.
- JSON requests/responses use UTF-8.
- Authenticate with Supabase session JWT; verify identity server-side.
- Never trust client-supplied tenant IDs or role claims without database membership checks.
- Validate all inputs with runtime schemas.
- Use `Idempotency-Key` for side-effect requests when supported.
- Return request/correlation ID for troubleshooting.

## 2. Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request could not be processed.",
    "request_id": "server-generated-id",
    "details": []
  }
}
```

Do not return stack traces, SQL, provider secrets, or cross-tenant record existence. Standard codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `UPSTREAM_TIMEOUT`, `INTEGRATION_NOT_CONFIGURED`, `APPROVAL_REQUIRED`, `STALE_APPROVAL`, `POLICY_BLOCKED`, `INTERNAL_ERROR`.

## 3. Core service contracts

### Identity and organization
- `create-organization`: authenticated user creates an organization and becomes its owner/admin; transactionally create membership.
- `invite-member`: verify inviter can invite requested role; create expiring invitation; never allow privilege escalation.
- `accept-invitation`: validate token, expiry, email/account match policy, and one-time use.
- `revoke-membership`: verify admin permission; revoke sessions/assignments as appropriate and write audit event.

### Properties
- `create-property`, `update-property`, `archive-property`: validate organization membership, allowed role, fields, uniqueness, and audit changes.
- `assign-property-member`, `revoke-property-member`: enforce organization relationship and capability bounds.

### Scanner and knowledge
- `start-property-scan`: verify access and allowed scan policy; return audit/run ID and status, not fabricated results.
- `get-scan-status`: scoped run status and findings.
- `review-scan-finding`: accept, reject, or convert finding to a proposed knowledge change; conversion creates a draft, never directly verifies it.
- `create-knowledge-item`, `update-knowledge-item`, `submit-knowledge-review`, `approve-knowledge-item`, `reject-knowledge-item`: enforce property access and version/audit rules.

### Enquiries and conversations
- `create-enquiry`, `import-enquiries`: validate rows, deduplicate using source/external ID where available, report row-level errors.
- `assign-enquiry`, `update-enquiry-status`, `schedule-follow-up`: validate allowed state transitions and property assignment.
- `create-conversation-message`: store manual message or draft; outbound external sending requires separate approval/execution path.
- `takeover-conversation`: set human takeover, pause automation, audit actor and reason.
- `handback-conversation`: require permission and explicit action; record actor and time.

### AI draft lifecycle
- `generate-reply-draft`: require authenticated authorized user, property-scoped conversation, active provider, and no incompatible state. Fetch only verified unexpired knowledge server-side. Return draft ID, text, source fact IDs, validation status, and escalation reason where applicable.
- `edit-reply-draft`: create/update a new version; invalidate approvals for prior versions.
- `approve-reply-draft`: require eligible approver; bind approval to exact draft version/hash; record decision and timestamp.
- `reject-reply-draft`: store reason and prevent execution.
- `execute-approved-reply`: server verifies approval/version, conversation takeover state, channel readiness, and idempotency; executes only through a configured adapter; records verified outcome. On uncertain timeout, mark `outcome_unknown` and require reconciliation.

### Tasks, reviews, content
- `create-task`, `update-task`, `comment-task`, `complete-task`: validate scope and state transitions.
- `create-review-response-draft`, `approve-review-response`, `publish-review-response`: publishing only when a verified provider adapter exists; otherwise return `INTEGRATION_NOT_CONFIGURED` and leave as manually publishable.
- `create-content-item`, `approve-content-item`, `publish-content-item`: same distinction between approved draft, manual publication, and provider-confirmed publication.

### Reports and integrations
- `generate-report-export`: validate requested scope, permission, date range, row limits, output encoding, expiry; log export event.
- `connect-integration`, `test-integration`, `disconnect-integration`: OAuth/state validation, minimal scopes, token secret storage, health verification.
- `provider-webhook`: verify signature before parsing/processing; deduplicate event ID; enqueue work and return promptly.

## 4. AI draft request/response shape

Request example:

```json
{
  "conversation_id": "uuid",
  "intent": "draft_reply",
  "language": "en"
}
```

Response example:

```json
{
  "draft_id": "uuid",
  "version": 1,
  "status": "needs_review",
  "text": "Draft text generated from verified property facts.",
  "source_knowledge_ids": ["uuid"],
  "validation": {"passed": true, "warnings": []},
  "sendable": false,
  "reason": "Human approval is required before sending."
}
```

The example is illustrative schema, not a claim that a deployed endpoint exists. The system must not invent a source ID or report `validation.passed=true` if validation did not run.

## 5. State and concurrency

Use optimistic concurrency (version column/ETag) for edits to knowledge and AI drafts. Reject stale updates with `CONFLICT`. A draft approval must reference exact version/hash. External side effects should use idempotency keys; webhook processing should tolerate duplicates. Use transactions for approval and queue insertion where possible.

## 6. Rate limits and size limits

Set and document per-user/provider limits, request body limits, attachment type/size limits, CSV row limits, export row limits, and timeouts. Do not accept arbitrary remote URLs for server-side fetching without SSRF protections and host/redirect validation.

## 7. API acceptance requirements

- Every privileged endpoint authenticates and checks authorization server-side.
- Invalid inputs return safe validation errors.
- Cross-tenant identifiers do not reveal whether records exist.
- AI provider failure is a recoverable error and never silently falls back to fabricated output.
- Outbound action success requires provider evidence.
- All privileged state changes emit audit events.
