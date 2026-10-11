# AtollHost UI Specification

## 1. Design direction

Premium, calm, modern SaaS operations workspace inspired by clean Shadcn-style dashboard patterns. Do not copy another product's branding. The interface must be buildable from text specifications; no image input is required.

## 2. Design tokens

Use CSS variables or a token system. Values below are the baseline; maintain contrast and validate actual rendered combinations.

```css
:root {
  --background: #f7f9fc;
  --surface: #ffffff;
  --surface-muted: #f1f5f9;
  --text: #0f172a;
  --text-muted: #64748b;
  --border: #e2e8f0;
  --sidebar: #101c2c;
  --sidebar-text: #e2e8f0;
  --primary: #0f766e;
  --primary-hover: #115e59;
  --primary-soft: #ccfbf1;
  --success: #15803d;
  --warning: #b45309;
  --danger: #b91c1c;
  --info: #1d4ed8;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-card: 0 1px 3px rgb(15 23 42 / 7%);
}
```

Typography: system UI or a maintained sans-serif family; body 14–16px, labels 12–14px, page titles 24–30px, line height 1.45–1.6. Spacing uses a consistent 4px base scale. Keep controls touch-friendly (prefer 40–44px minimum height for primary interactions).

## 3. Global shell

### Agency workspace
- Left navy sidebar with AtollHost wordmark, organization switcher, primary navigation, property context, settings/help at bottom.
- Top bar with page title/breadcrumb, global search where applicable, notifications, user menu.
- Main workspace with consistent page gutters, responsive grid, clear primary action, filter row, and content.
- Navigation groups: Overview; Properties; Scanner; Enquiries; Inbox; Property Brain; Tasks; Guest Journey; Reviews; Content; Reports; Integrations; Team & Access; Settings.

### Owner workspace
- Property-scoped header and property switcher only for properties assigned to that user.
- Navigation limited to allowed modules: Overview, Property Profile, Knowledge & FAQs, Enquiries/Inbox (if granted), Tasks, Reviews, Content Approvals, Reports, Team/Settings (if granted).
- Never show agency-wide totals or links that imply access to other properties.

### Mobile
- Sidebar becomes an accessible drawer/bottom navigation based on information architecture.
- Tables become responsive cards or horizontally scrollable with clear labels; never hide critical action buttons.
- Dialogs fit viewport, preserve focus, and provide visible close/cancel controls.

## 4. Components

- Buttons: primary, secondary, outline, ghost, destructive, icon-only with accessible name, loading/disabled states.
- Form fields: label, helper text, required indicator, inline validation, server error, disabled/read-only state.
- Data table: sorting, filters, pagination, selection only when bulk actions are safe, empty state, skeleton rows, row-level actions.
- Cards/stat cards: title, metric, date/context, optional trend with defined meaning; do not imply unsupported precision.
- Status badges: draft, pending review, verified, overdue, failed, connected, degraded, unknown, etc. Color must not be the only status indicator.
- Dialogs/sheets: confirmation for destructive or irreversible actions; show impact and object name.
- Toasts: brief success/failure feedback; durable errors also remain inline.
- Timeline: chronological messages/events with actor and timestamp; distinguish AI draft, human message, provider-confirmed send, and manual note.
- AI draft panel: AI label, source facts, warnings, edit field, approve/reject, no-send status until approved.
- Knowledge fact card: fact, source, verification status, reviewer, last verified/expiry, version history.
- Permission-denied state: explain insufficient access without revealing inaccessible records.

## 5. Screen inventory

Use all IDs in `INTERFACE_SCREENS_AND_WORKFLOWS.md`. Core inventory includes:

- Auth: sign in, sign up, password reset, verification, invitation acceptance, onboarding, access denied.
- Agency: dashboard, property list/detail/create/edit, Scanner, findings, Property Brain, enquiries, inbox/conversation, AI approvals, tasks, guest journey, reviews, content, reports/exports, integrations, team/access, notifications, audit log, organization settings.
- Owner: property dashboard, profile, knowledge, enquiries/inbox (permission-gated), tasks, reviews, content approvals, reports, team/settings where permitted.

Do not silently drop screen IDs. If two IDs share a component, preserve distinct route/permission/state behavior.

## 6. Required screen states

For each data-driven screen, implement applicable states:
- **Loading:** skeletons or progress text; avoid layout shifts.
- **Empty:** explain why empty and provide a relevant first action.
- **Error:** human-readable message, retry if safe, reference/request ID if useful.
- **Success:** confirmation that reflects the actual persisted result.
- **Permission denied:** no sensitive data, explain how to request access.
- **Offline/degraded:** indicate stale data and disable unsafe actions.
- **Partial failure:** identify which rows/actions failed; support safe retry.

## 7. Interaction rules

- Validate forms on blur/submit; preserve user input after recoverable errors.
- Use explicit confirmation for delete/archive, revoke access, publish/send, and other irreversible actions.
- Show unsaved-change warning when leaving an edited form.
- Disable duplicate submission while an action is in progress and use idempotency for server-side effects.
- Never indicate a message was sent unless provider delivery result confirms it.
- A draft approval must become stale if its text/version changes.
- Human takeover state is persistent and prominent; no automatic reply while active.
- Use timezone-aware display and consistent date/currency formatting.
- Keyboard support: logical tab order, visible focus, Escape closes modal when safe, focus returns to trigger, screen-reader labels.

## 8. Content and copy

Use clear plain English and avoid unexplained technical terms. Use “Not connected” instead of a fake integration state; “Draft ready for review” instead of “AI replied”; “Outcome not confirmed” when provider result is ambiguous. Do not use tax/compliance language that implies official approval.

## 9. Visual acceptance

- Consistent layout and tokens across agency and owner portals.
- No clipped navigation or horizontal overflow at common mobile widths.
- Focus states visible; color contrast checked.
- Tables, forms, dialogs, and toasts work with keyboard and touch.
- All screen IDs navigable in authorized role; unauthorized routes are blocked server-side and display safe UI state.
- The written screen/workflow file and actual implementation stay synchronized.
