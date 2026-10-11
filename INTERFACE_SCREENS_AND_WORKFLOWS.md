# AtollHost --- Interface Screens and Workflow Charts

**Version:** 1.0\
**Purpose:** Screen-by-screen interface and workflow specification for
AtollHost.\
**Audience:** Product owner, UI/UX designer, Claude Code, Kilo Code,
developers, and QA.

> **Product principle:** One dashboard. One AI assistant. Every
> guesthouse.

AtollHost is an AI-assisted digital operations platform for Maldives
guesthouses. An agency manages multiple properties from one workspace;
each guesthouse owner sees only their assigned property data. AtollHost
initially complements existing PMS products rather than replacing them.

This document specifies the intended product. It does not mean all
features are already implemented. Mark each feature as **Implemented**,
**Manual**, **Mocked**, **Integration-dependent**, or **Future** in the
project checklist.

------------------------------------------------------------------------

## 1. Roles and access

  -----------------------------------------------------------------------
  Role                    Scope                   Typical permissions
  ----------------------- ----------------------- -----------------------
  Platform administrator  Platform-wide, only if  Platform diagnostics
                          explicitly authorized   and support

  Agency owner/admin      One organization and    Manage properties,
                          its authorized          team, operations,
                          properties              reports and
                                                  configuration

  Agency staff            Organization and        Perform permitted
                          assigned properties     agency operations

  Guesthouse owner        Assigned                Manage permitted
                          property/properties     property operations
                          only                    

  Property staff          Assigned property and   Tasks, guest operations
                          allowed modules         and approved
                                                  communications
  -----------------------------------------------------------------------

**Security requirements** - PostgreSQL Row Level Security (RLS) is the
real data boundary; frontend filtering alone is insufficient. - Changing
an ID in a URL or request must never grant access. - Validate
organization membership, property membership, and role permissions
server-side/database-side. - Sensitive guest identity documents require
stricter access. - Never expose integration secrets in browser code. -
Human takeover pauses automatic replies for that conversation. - Record
important changes and AI-triggered actions in an audit trail. - Never
report an external action as successful until the provider confirms it.

## 2. Global navigation map

``` mermaid
flowchart TD
    A[AtollHost] --> B{Authenticated?}
    B -- No --> C[Sign in / Sign up / Password recovery]
    C --> D[Load profile and memberships]
    B -- Yes --> D
    D --> E{Authorized membership and role}
    E -- Agency --> F[Agency workspace]
    E -- Owner or property staff --> G[Owner workspace]
    E -- No --> H[Access denied / request access]
    F --> F1[Dashboard]
    F --> F2[Properties]
    F --> F3[Guesthouse Scanner]
    F --> F4[Enquiries and Inbox]
    F --> F5[Tasks and Guest Journey]
    F --> F6[Property Brain]
    F --> F7[Reviews and Content]
    F --> F8[Reports]
    F --> F9[Integrations]
    F --> F10[Team and Settings]
    G --> G1[Dashboard]
    G --> G2[Enquiries and Conversations]
    G --> G3[Guests and Reservations]
    G --> G4[Tasks and Guest Journey]
    G --> G5[Property Brain]
    G --> G6[Reviews and Reports]
    G --> G7[Property Settings]
```

Global UI components: role-appropriate navigation, authorized property
selector, global search, notifications, profile/logout, breadcrumbs,
loading/empty/error/success states, responsive tables/cards,
confirmation dialogs, accessible labels and keyboard focus.

------------------------------------------------------------------------

## 3. Screen inventory

### 3.1 Authentication and account

  ------------------------------------------------------------------------------
  ID                Screen             Primary actions         Required states
  ----------------- ------------------ ----------------------- -----------------
  AUTH-01           Sign in            Enter credentials,      Loading, invalid
                                       submit                  credentials,
                                                               success, network
                                                               error

  AUTH-02           Sign up            Create account if       Validation,
                                       enabled                 existing account,
                                                               success

  AUTH-03           Forgot password    Request reset email     Submitting,
                                                               confirmation,
                                                               failure

  AUTH-04           Reset password     Set new password        Expired link,
                                                               validation,
                                                               success

  AUTH-05           Invitation         Accept                  Valid, expired,
                    acceptance         organization/property   revoked, already
                                       invitation              accepted

  AUTH-06           Access denied      Explain lack of access  Unauthorized,
                                                               inactive
                                                               membership

  AUTH-07           Profile/security   Update permitted        Saving,
                                       fields, sign out        validation,
                                                               success, error
  ------------------------------------------------------------------------------

Do not allow users to grant themselves organization/property access
during registration. Membership must come from an authorized invitation
or administrator action.

### 3.2 Agency screens

  ----------------------------------------------------------------------------
  ID                      Screen                  Main contents/actions
  ----------------------- ----------------------- ----------------------------
  AG-01                   Dashboard               Portfolio KPIs, urgent
                                                  queue, property health,
                                                  recent activity

  AG-02                   Property list           Search/filter properties,
                                                  owner, location, status and
                                                  onboarding

  AG-03                   Create/edit property    Business details, contacts,
                                                  location, website/social
                                                  links, defaults

  AG-04                   Property detail         Overview, users, knowledge,
                                                  tasks, enquiries,
                                                  integrations

  AG-05                   Onboarding checklist    Missing information, owner
                                                  access, documents and setup
                                                  status

  AG-06                   Scanner list            Audit status, score, dates;
                                                  start/resume audit

  AG-07                   Scanner setup           Property, public sources,
                                                  audit scope and evidence
                                                  settings

  AG-08                   Scanner report          Evidence, scores, findings,
                                                  priorities, recommendations
                                                  and export

  AG-09                   Enquiries               Pipeline, source, dates,
                                                  guest, assignee and status

  AG-10                   Enquiry detail          Requirements, guest context,
                                                  activity, follow-up and
                                                  response draft

  AG-11                   Unified inbox           Conversation list,
                                                  assignment, reply, resolve,
                                                  takeover

  AG-12                   Conversation detail     Timeline, guest context, AI
                                                  drafts, approval and
                                                  delivery state

  AG-13                   Guest list              Search/filter guest records,
                                                  open profile

  AG-14                   Guest detail            Contact details, history,
                                                  stays, requests and linked
                                                  records

  AG-15                   Reservation list        Search/filter
                                                  manual/imported/integrated
                                                  reservations

  AG-16                   Reservation detail      Guest, dates, room, source,
                                                  status and amounts

  AG-17                   Tasks board/list        Priority, due date,
                                                  property, assignee and
                                                  status

  AG-18                   Task detail             Description, linked records,
                                                  comments, history and
                                                  completion

  AG-19                   Guest Journey board     Guest/stay progress by
                                                  lifecycle stage

  AG-20                   Journey detail          Timeline, required data,
                                                  tasks, messages and
                                                  exceptions

  AG-21                   Property Brain library  Categories, approval state,
                                                  freshness and search

  AG-22                   Knowledge editor        Content, source, category,
                                                  version, draft/approval
                                                  state

  AG-23                   Reviews                 Rating, source, sentiment,
                                                  draft response and
                                                  publication state

  AG-24                   Content calendar        Drafts, planned posts,
                                                  platform and property

  AG-25                   Content editor          Caption, media, platform,
                                                  factual source and approval

  AG-26                   Reports                 Portfolio metrics, activity,
                                                  date/property filters and
                                                  exports

  AG-27                   Integrations hub        Provider status,
                                                  permissions, last sync,
                                                  errors and retry

  AG-28                   Automation rules        Trigger, conditions, actions
                                                  and enabled state

  AG-29                   Automation run detail   Steps, result, errors and
                                                  safe retry

  AG-30                   Team/permissions        Members, invitations, roles
                                                  and property scope

  AG-31                   Agency settings         Organization profile,
                                                  defaults and notifications

  AG-32                   Audit log               Actor, action, target, time
                                                  and result

  AG-33                   Usage/AI monitoring     AI usage, failures,
                                                  estimated costs and limits
  ----------------------------------------------------------------------------

### 3.3 Guesthouse owner screens

  -----------------------------------------------------------------------
  ID                      Screen                  Main contents/actions
  ----------------------- ----------------------- -----------------------
  OWN-01                  Owner dashboard         Arrivals, departures,
                                                  enquiries, tasks and
                                                  alerts

  OWN-02                  My property             Property profile and
                                                  completeness

  OWN-03                  Enquiries               Pipeline, follow-ups
                                                  and response actions

  OWN-04                  Conversations           Messages, AI drafts,
                                                  approvals and takeover

  OWN-05                  Guests                  Authorized guest list
                                                  and search

  OWN-06                  Guest detail            Guest history, requests
                                                  and linked stay

  OWN-07                  Reservations            Authorized booking
                                                  records and filters

  OWN-08                  Reservation detail      Dates, room, guest
                                                  count, source and
                                                  status

  OWN-09                  Tasks                   Assigned property
                                                  tasks, comments and
                                                  completion

  OWN-10                  Guest Journey           Arrival, stay, checkout
                                                  and review progress

  OWN-11                  Property Brain          Approved knowledge and
                                                  permitted edits

  OWN-12                  Knowledge approval      Review proposed changes
                                                  if authorized

  OWN-13                  Reviews                 Review records and
                                                  response drafts

  OWN-14                  Content                 Draft and approved
                                                  marketing content

  OWN-15                  Reports                 Property-only activity
                                                  and performance

  OWN-16                  Integrations            Authorized connection
                                                  status and reconnect

  OWN-17                  Property settings       Contacts, defaults and
                                                  notifications

  OWN-18                  Team access             Property invitations
                                                  and access, if enabled
  -----------------------------------------------------------------------

Owners must not see agency-wide portfolio data, other guesthouses'
records, private internal agency notes, or integration credentials.

### 3.4 Reusable UI components

-   Search/filter/sort/pagination list.
-   Create/edit form with validation and unsaved-change protection.
-   Detail page with summary, tabs, related records and activity
    timeline.
-   Destructive-action confirmation.
-   AI approval panel.
-   Status badge and transition menu.
-   Authorized assignee picker.
-   Validated file upload.
-   Export dialog with included fields and sensitivity notes.
-   Error panel with safe retry.
-   Mobile action sheet.

------------------------------------------------------------------------

## 4. Agency dashboard workflow

The agency dashboard answers: **"What needs my attention today?"**

Show active properties, unanswered enquiries, urgent conversations,
pending approvals, overdue tasks, recent booking records, review
activity, automation failures, property audit findings and important
alerts. Show estimated time saved only as an estimate with its
assumptions.

``` mermaid
flowchart TD
    A[Agency user opens dashboard] --> B[Load authorized portfolio data]
    B --> C[Calculate documented metrics]
    C --> D[Build attention queue]
    D --> E[Display property health and activity]
    E --> F{User selects an item}
    F -- Enquiry --> G[Open enquiry/conversation]
    F -- Task --> H[Open task]
    F -- Property --> I[Open property detail]
    F -- Integration error --> J[Open integration diagnostics]
```

## 5. Property onboarding workflow

``` mermaid
flowchart TD
    A[Add property] --> B[Enter business details]
    B --> C[Validate required fields]
    C --> D{Valid?}
    D -- No --> B
    D -- Yes --> E[Create property under authorized organization]
    E --> F[Invite owner if requested]
    F --> G[Collect rooms, services, contacts and policies]
    G --> H[Create Property Brain drafts]
    H --> I[Verify sources and facts]
    I --> J[Approve knowledge]
    J --> K[Configure tasks and available integrations]
    K --> L[Run onboarding checklist]
    L --> M{Complete enough for operation?}
    M -- No --> N[Create follow-up tasks]
    N --> L
    M -- Yes --> O[Mark operational]
```

Show missing information and setup progress. Do not mark unverified
property facts as approved. Invitation failure must not create
unintended membership.

## 6. Guesthouse Scanner workflow

Scanner checks publicly available digital presence: official directory
listings where available, Google Business information, websites, public
social profiles, public OTA listings, contact links and public reviews.

``` mermaid
flowchart TD
    A[Select property/prospect] --> B[Select public sources and scope]
    B --> C[Run permitted source checks]
    C --> D[Collect evidence and source URLs]
    D --> E[Classify findings]
    E --> F[Check confidence and freshness]
    F --> G{Evidence adequate?}
    G -- No --> H[Mark unknown/manual review]
    G -- Yes --> I[Generate finding and recommendation]
    H --> J[Calculate scores from available evidence]
    I --> J
    J --> K[Create report with limitations]
    K --> L[Agency reviews report]
    L --> M[Share/export approved report]
    M --> N[Create tasks and outreach draft]
```

Rules: - Do not bypass authentication, CAPTCHAs, access controls or
provider restrictions. - A missing result does not prove a business has
no account. - Each finding needs evidence or must be marked as a manual
observation. - Scores must explain the formula and how unavailable
categories affect the result. - Review outreach drafts before sending.

## 7. Enquiry CRM workflow

Statuses: **New → Contacted → Waiting/Follow-up → Qualified → Converted
or Lost**. Transitions must be validated and preserve history.

``` mermaid
flowchart TD
    A[Manual entry/import/connected channel] --> B[Normalize enquiry]
    B --> C[Find or create guest safely]
    C --> D[Associate property and source]
    D --> E[Classify intent and extract stated requirements]
    E --> F[Create enquiry record]
    F --> G[Show in CRM pipeline]
    G --> H{Verified answer/live data available?}
    H -- Yes --> I[Generate response draft]
    H -- No --> J[Ask clarification or escalate]
    I --> K{Approval required?}
    K -- Yes --> L[Human reviews draft]
    K -- No --> M[Safety validation]
    L --> M
    M --> N{Approved and valid?}
    N -- No --> O[Revise or keep pending]
    N -- Yes --> P[Send via supported channel or provide manual draft]
    P --> Q[Record result and activity]
    Q --> R{Follow-up needed?}
    R -- Yes --> S[Schedule follow-up task]
    R -- No --> T[Monitor conversion or close]
```

Enquiry fields: guest, property, source, original message, dates,
adults/children, room preference, stated budget/preferences, intent,
status, assignee, follow-up deadline, linked conversation, outcome and
timestamps.

## 8. Unified inbox and human takeover

``` mermaid
flowchart TD
    A[Message received/manual entry] --> B[Normalize channel payload]
    B --> C[Authorize property and conversation]
    C --> D[Store message and event]
    D --> E{Human takeover active?}
    E -- Yes --> F[Notify human; do not auto-reply]
    E -- No --> G[Classify intent and retrieve approved knowledge]
    G --> H[Generate draft]
    H --> I[Validate confidence and policy]
    I --> J{Safe for permitted action?}
    J -- No --> K[Escalate to human]
    J -- Yes --> L{Approval required?}
    L -- Yes --> M[Approval queue]
    L -- No --> N[Send through available channel]
    M --> O[Human edits/approves/rejects]
    O --> P[Send only if approved]
    N --> Q[Record actual provider result]
    P --> Q
    K --> R[Record reason and create task if needed]
    Q --> S[Update conversation and audit history]
```

Display channel, timestamps, AI draft label, approval state, takeover
state, and actual sending/delivery/failure state. A generated draft is
not a sent message.

## 9. Property Brain workflow

``` mermaid
flowchart TD
    A[Create/import knowledge] --> B[Validate content and category]
    B --> C[Record source, owner and version]
    C --> D[Save as draft]
    D --> E[Review factual accuracy]
    E --> F{Approved?}
    F -- No --> G[Correct or archive]
    F -- Yes --> H[Make approved version searchable]
    H --> I[AI request arrives]
    I --> J[Verify property scope]
    J --> K[Retrieve approved relevant records]
    K --> L{Evidence sufficient?}
    L -- No --> M[Ask or escalate; never invent]
    L -- Yes --> N[Generate evidence-grounded response]
    N --> O[Validate policy]
    O --> P[Return draft or permitted response]
```

Knowledge categories include property overview, rooms, rates,
availability source, check-in/out, meals, facilities, transfers,
activities, children, extra beds, payments, cancellation, island
information, FAQs and emergency contacts. Preserve versions and retire
outdated knowledge from active retrieval.

## 10. AI safety and action workflow

``` mermaid
flowchart TD
    A[Request/event] --> B[Authenticate actor and scope]
    B --> C[Route to approved workflow]
    C --> D[Retrieve authorized context]
    D --> E[Generate structured proposal]
    E --> F[Validate schema and allowed action]
    F --> G[Validate facts and required fields]
    G --> H[Apply confidence and policy rules]
    H --> I{Sensitive or uncertain?}
    I -- Yes --> J[Require human approval]
    I -- No --> K{Role/channel permits action?}
    K -- No --> J
    K -- Yes --> L[Execute server-side]
    J --> M{Approved?}
    M -- No --> N[Reject/cancel and log]
    M -- Yes --> K
    L --> O[Verify database/provider result]
    O --> P{Confirmed success?}
    P -- No --> Q[Record failure/uncertain state]
    P -- Yes --> R[Record success]
    N --> S[Audit event]
    Q --> S
    R --> S
```

Initially require human review for refunds, cancellations, policy
exceptions, unverified rates/availability, transfer changes, complaints,
government submissions and uncertain guest identity. AI must never
invent prices, availability, schedules, policies, or successful external
actions.

## 11. Task workflow

``` mermaid
flowchart TD
    A[Manual action/AI proposal/workflow trigger] --> B[Propose task]
    B --> C[Validate property, assignee, priority and due date]
    C --> D[Save task and source link]
    D --> E[Notify authorized assignee]
    E --> F[Assignee works on task]
    F --> G{Completed?}
    G -- No --> H[Update status/comment]
    H --> F
    G -- Yes --> I[Record completion and actor]
    I --> J[Update linked enquiry/journey if applicable]
    J --> K[Check next workflow]
```

Task statuses: To do, In progress, Waiting, Completed, Cancelled.
Priorities: Low, Normal, High, Urgent. Never assign a task to a user
without access to its property.

## 12. Guest Journey workflow

``` mermaid
stateDiagram-v2
    [*] --> Enquiry
    Enquiry --> BookingPending: Guest qualified
    BookingPending --> Confirmed: Reliable confirmation recorded
    BookingPending --> Lost: Enquiry closed
    Confirmed --> PreArrival
    PreArrival --> Transfer: Transfer applies
    PreArrival --> Arrival: No transfer needed
    Transfer --> Arrival: Arrangement confirmed
    Arrival --> InStay: Check-in recorded
    InStay --> Checkout: Departure starts
    Checkout --> ReviewRequested: Checkout recorded
    ReviewRequested --> Completed: Journey closed
    Completed --> RepeatGuestFollowUp: Permitted follow-up due
    RepeatGuestFollowUp --> [*]
```

Each stage should show required/optional information, tasks, message
templates, responsible user and exceptions. Do not mark a booking
confirmed without a reliable confirmation. Failed integrations must not
advance the journey as if successful.

## 13. Reviews workflow

``` mermaid
flowchart TD
    A[Review entered/retrieved] --> B[Validate source and property]
    B --> C[Store review and rating]
    C --> D[Analyze sentiment/topics]
    D --> E[Draft response]
    E --> F[Check private data and unsupported claims]
    F --> G[Human review]
    G --> H{Approved?}
    H -- No --> I[Edit/reject/regenerate]
    I --> G
    H -- Yes --> J{Authorized publishing integration?}
    J -- Yes --> K[Publish through provider]
    J -- No --> L[Provide copy-ready response]
    K --> M[Record actual result]
    L --> N[Mark prepared, not published]
    M --> O[Update status]
    N --> O
```

Do not disclose private guest information. Review requests must respect
guest preferences and platform rules.

## 14. Content workflow

``` mermaid
flowchart TD
    A[Choose property/channel/goal] --> B[Retrieve approved brand facts]
    B --> C[Generate draft]
    C --> D[Check factual claims and format]
    D --> E[Human edits and approves]
    E --> F{Publishing supported?}
    F -- Yes --> G[Schedule/publish through authorized integration]
    F -- No --> H[Save copy-ready draft and manual instructions]
    G --> I[Record provider result]
    H --> J[Mark ready for manual use]
    I --> K[Update content calendar]
    J --> K
```

Content features: post ideas, captions, room/property descriptions,
activity descriptions, seasonal campaigns, FAQs, templates, calendar,
approval state, media references and publication status. Do not claim
auto-publishing when only a draft exists.

## 15. Integration workflow

``` mermaid
flowchart TD
    A[Authorized user selects provider] --> B[Show capabilities and prerequisites]
    B --> C[Secure authorization/credential setup]
    C --> D{Authorization successful?}
    D -- No --> E[Show safe error]
    D -- Yes --> F[Store secrets server-side]
    F --> G[Validate connection and scopes]
    G --> H{Required permissions present?}
    H -- No --> I[Show missing permissions]
    H -- Yes --> J[Enable supported capabilities]
    J --> K[Receive webhook or scheduled sync]
    K --> L[Verify and deduplicate event]
    L --> M[Normalize provider data]
    M --> N[Apply authorized update]
    N --> O[Record result and sync cursor]
    O --> P{Failure?}
    P -- Yes --> Q[Log and safely retry if appropriate]
    P -- No --> R[Update last-success time]
```

Provider adapters should isolate the core application from WhatsApp,
Google Business Profile, Booking.com, Agoda and PMS vendors such as
Vayves, Fenuva, OneOS, Acuity, HotelPro and Cloudbeds. Real connectivity
requires actual credentials, authorization, supported API capability and
end-to-end testing. Never invent endpoints or represent a mock adapter
as live.

## 16. Tax and MGIS workflow

``` mermaid
flowchart TD
    A[Reservation/stay/tax data entered or imported] --> B[Validate fields and effective dates]
    B --> C[Calculate using reviewed configurable rules]
    C --> D[Store tax and separate charge records]
    D --> E[Generate period report/export]
    E --> F[Human/accountant review]
    F --> G{Verified authorized submission available?}
    G -- No --> H[Provide export/manual process]
    G -- Yes --> I[Submit through verified integration]
    I --> J[Wait for external response]
    J --> K{Confirmed accepted?}
    K -- Yes --> L[Store acknowledgement/reference]
    K -- No --> M[Store pending/rejected status and errors]
    M --> N[Correction workflow]
```

Tax rates must be configurable and effective-dated. Keep room price,
applicable tax and additional charges separate. Preserve relevant
historical rates. Guest identity and travel-document details are
sensitive. Never claim MIRA/MGIS compliance or acceptance without
verified implementation and official confirmation.

## 17. Reports workflow

``` mermaid
flowchart TD
    A[Open Reports] --> B[Select period, property and report]
    B --> C[Validate scope and filters]
    C --> D[Query authorized records]
    D --> E[Calculate documented metrics]
    E --> F[Label estimates and missing data]
    F --> G[Render report]
    G --> H{Export requested?}
    H -- No --> I[View report]
    H -- Yes --> J[Generate authorized export]
    J --> K[Secure download and optional audit event]
```

## 18. Invitations and access revocation

``` mermaid
flowchart TD
    A[Authorized admin invites user] --> B[Choose role and scope]
    B --> C[Validate inviter permissions]
    C --> D[Create expiring invitation]
    D --> E[Send invitation]
    E --> F[Invitee authenticates]
    F --> G[Validate token, expiry and intended scope]
    G --> H{Valid and not revoked?}
    H -- No --> I[Reject invitation]
    H -- Yes --> J[Create least-privilege membership]
    J --> K[Audit event]
    K --> L[Show authorized workspace]
```

Revoking membership must remove access in the authoritative
authorization layer immediately, not merely hide a user in the UI.

------------------------------------------------------------------------

## 19. Dashboard metrics and definitions

  -----------------------------------------------------------------------
  Metric                  Suggested definition    Caveat
  ----------------------- ----------------------- -----------------------
  Active properties       Active, non-archived    Define active status
                          property records        

  New enquiries           Enquiries created in    Deduplicate imports
                          selected period         

  Unanswered enquiries    Enquiries still         Document status logic
                          requiring response      

  First response time     Time from receipt to    Separate AI and human
                          first recorded reply    response if useful

  Follow-up completion    Due follow-ups          Explain cancellations
                          completed / follow-ups  
                          due                     

  Conversion rate         Enquiries linked to     Only if linkage is
                          confirmed bookings /    reliable
                          eligible enquiries      

  Overdue tasks           Open tasks past due     Use property timezone

  Review response rate    Reviews with recorded   Draft is not published
                          responses / eligible    
                          reviews                 

  Automation success      Successful runs /       Show pending and
                          completed runs          failures separately

  AI escalation rate      Eligible AI             Define denominator
                          interactions escalated  
                          / eligible AI           
                          interactions            

  Estimated time saved    Estimated effort        Must be labelled
                          avoided using           estimate
                          documented assumptions  
  -----------------------------------------------------------------------

## 20. Notifications

  -----------------------------------------------------------------------
  Event                   Recipient               Default behavior
  ----------------------- ----------------------- -----------------------
  New enquiry             Assigned team/property  In-app alert
                          user                    

  Urgent/negative         Assigned user/attention High priority
  conversation            queue                   

  AI draft needs approval Authorized approver     In-app alert

  Task due/overdue        Assignee                Reminder

  Arrival information     Operational assignee    Task/alert
  missing                                         

  Integration failure     Integration manager     Error alert

  Review needs response   Assigned user           Task/alert

  Invitation accepted     Inviter/admin           In-app alert

  Membership revoked      Authorized admin        Audit event and access
                                                  removal

  Weekly report ready     Owner                   In-app alert; email if
                                                  configured
  -----------------------------------------------------------------------

Do not put sensitive guest details into notification previews unless the
recipient and channel are authorized.

## 21. Core data model map

This is a conceptual relationship map, not a replacement for the
canonical SQL schema.

``` mermaid
erDiagram
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : has
    PROFILES ||--o{ ORGANIZATION_MEMBERS : joins
    ORGANIZATIONS ||--o{ PROPERTIES : owns
    PROPERTIES ||--o{ PROPERTY_USERS : grants_access
    PROFILES ||--o{ PROPERTY_USERS : assigned
    PROPERTIES ||--o{ ROOMS : contains
    PROPERTIES ||--o{ GUESTS : records
    GUESTS ||--o{ RESERVATIONS : makes
    PROPERTIES ||--o{ RESERVATIONS : receives
    PROPERTIES ||--o{ ENQUIRIES : receives
    GUESTS ||--o{ ENQUIRIES : submits
    PROPERTIES ||--o{ CONVERSATIONS : owns
    CONVERSATIONS ||--o{ CONVERSATION_MESSAGES : contains
    PROPERTIES ||--o{ KNOWLEDGE_ITEMS : documents
    PROPERTIES ||--o{ TASKS : has
    PROFILES ||--o{ TASKS : assigned_to
    PROPERTIES ||--o{ REVIEWS : receives
    PROPERTIES ||--o{ DIGITAL_AUDITS : audited
    DIGITAL_AUDITS ||--o{ AUDIT_ITEMS : contains
    PROPERTIES ||--o{ INTEGRATIONS : configures
    PROPERTIES ||--o{ GUEST_JOURNEY_EVENTS : tracks
    PROPERTIES ||--o{ TAX_TRANSACTIONS : records
    PROPERTIES ||--o{ MGIS_RECORDS : tracks
```

Implementation requirements: use canonical repository names; add foreign
keys, uniqueness constraints and indexes; decide whether each record is
organization-, property- or platform-scoped; validate cross-table
ownership; apply RLS to tenant-scoped tables. Adding an
`organization_id` column alone does not make a table secure.

## 22. UI states and quality rules

Every screen must have: - Loading state and protection against duplicate
submission. - Useful empty state and primary action where allowed. -
User-safe error state and safe retry where possible. - Success
feedback. - Responsive layout and accessible controls. - Correct
role/property scope. - Real data binding when described as functional. -
Appropriate audit events. - Tests for permissions and important
behavior. - No unimplemented button falsely presented as working. - No
fake production records or exposed secrets.

For destructive actions, confirm intent, explain impact, enforce
server-side permission, and record sensitive changes. Use UTC timestamps
in storage, display the property's configured timezone, store currency
explicitly and use decimal/numeric types for financial calculations.

## 23. Acceptance test matrix

  -----------------------------------------------------------------------
  ID                      Scenario                Expected result
  ----------------------- ----------------------- -----------------------
  SEC-01                  Agency A requests       Database denies access
                          Agency B property       

  SEC-02                  Owner alters property   No cross-property
                          ID                      access

  SEC-03                  Unauthenticated request Rejected
                          reads private data      

  SEC-04                  Property staff attempts Rejected server-side
                          admin action            

  AUTH-01                 Valid sign-in           Authorized workspace
                                                  loads

  AUTH-02                 Expired/revoked         Membership not created
                          invitation              

  PROP-01                 Agency creates property Correct organization
                                                  scope

  BRAIN-01                Known question with     Grounded answer
                          approved knowledge      

  BRAIN-02                Unknown question        Ask/escalate; do not
                                                  invent

  CRM-01                  New enquiry entered     Appears in correct
                                                  property pipeline

  CRM-02                  Follow-up becomes due   Configured
                                                  task/notification
                                                  appears

  MSG-01                  Human takeover active   No automatic reply

  MSG-02                  Approval required       Draft remains unsent

  TASK-01                 Assign to unauthorized  Rejected
                          user                    

  REVIEW-01               Draft not published     UI does not say
                                                  published

  SCAN-01                 Source unavailable      Unknown/unavailable,
                                                  not fabricated

  AUTO-01                 Duplicate webhook event Duplicate side effects
                                                  prevented

  INT-01                  Missing credentials     Not connected, not live

  INT-02                  API timeout             Uncertain/failure state
                                                  until verified

  TAX-01                  Effective-dated rate    Correct historical rate
                          changes                 applied

  MGIS-01                 No external             Not marked accepted
                          acknowledgement         

  REPORT-01               Owner opens report      Only authorized
                                                  property data

  UI-01                   Empty list              Useful empty state

  BUILD-01                Phase claimed complete  Lint, typecheck, tests
                                                  and build pass
  -----------------------------------------------------------------------

## 24. Development phases

1.  **Foundation:** inspect repository; verify install, lint, typecheck,
    tests and build.
2.  **Database/security:** migrations, constraints, indexes, helper
    functions, real RLS and tenant-isolation tests.
3.  **Authentication:** sign-in/out, recovery, protected routes,
    memberships and invitations.
4.  **Application shells:** agency/owner layouts, dashboards, properties
    and responsive components.
5.  **Property Brain and CRM:** knowledge approval, enquiries, guests,
    reservations, conversations and messages.
6.  **Tasks and guest journey:** task lifecycle, assignment, reminders
    and journey stages.
7.  **AI foundation:** provider abstraction, routing, retrieval, safe
    drafts, approval and audit.
8.  **Scanner and reviews:** evidence-based audits, reports and review
    workflow.
9.  **Content, reports and automation:** calendar, documented metrics
    and workflow runs.
10. **Integrations:** authorized provider adapters, webhook validation,
    deduplication, retries and monitoring.
11. **Compliance support:** verify current official tax/MGIS
    requirements before implementation claims.
12. **Production hardening:** security audit, mobile testing, dependency
    audit, monitoring, backups and rollback plan.

## 25. Implementation instructions for Claude Code/Kilo Code

1.  Read this file alongside the repository master prompt and existing
    product, UI, database, AI and security specifications.
2.  Inspect the current repository before changing files.
3.  Treat existing applied migrations as immutable; add new migrations
    for changes.
4.  If requirements conflict, document the conflict in
    `docs/DECISIONS.md` rather than silently choosing.
5.  Implement one phase at a time.
6.  Run the repository's actual lint, typecheck, tests and build after
    each phase.
7.  Fix failures before continuing.
8.  Update the build checklist with **Implemented**, **Partial**,
    **Manual**, **Mocked**, **Blocked**, or **Future**.
9.  Never claim an external integration is live without successful
    authorization and end-to-end verification.
10. Do not mark a feature complete until screen, data, security,
    workflow and acceptance criteria are tested.

### Phase completion report

``` text
PHASE:
SCREENS IMPLEMENTED:
WORKFLOWS IMPLEMENTED:
DATABASE/MIGRATIONS CHANGED:
SECURITY POLICIES VERIFIED:
TESTS ADDED:
LINT:
TYPECHECK:
TEST RESULTS:
PRODUCTION BUILD:
LIVE INTEGRATIONS:
MOCKED OR MANUAL FEATURES:
KNOWN ISSUES:
ACCEPTANCE CRITERIA PASSED:
NEXT PHASE:
```

## 26. Open decisions to confirm before production

-   Public self-registration or invitation-only accounts.
-   Exact agency/property staff permission matrix.
-   PMS used by the first pilot guesthouses.
-   First communication channel to integrate.
-   Whether all AI replies require approval during the pilot.
-   Scanner scoring formula and unavailable-source handling.
-   Retention/deletion policy for guest identity information.
-   Official tax/MGIS fields and submission protocol.
-   First required report exports.
-   Content scheduling scope.
-   Hosting/domain, backup frequency and recovery objectives.
-   Monitoring and AI usage budget limits.

## 27. End-to-end product workflow

``` mermaid
flowchart LR
    A[Discover prospect] --> B[Run digital audit]
    B --> C[Onboard guesthouse]
    C --> D[Verify Property Brain]
    D --> E[Capture enquiries]
    E --> F[AI-assisted conversations]
    F --> G[Approval or permitted safe action]
    G --> H[Follow-up and booking record]
    H --> I[Guest Journey]
    I --> J[Tasks and operations]
    J --> K[Checkout and review]
    K --> L[Reports and improvement]
    L --> B
```

The cycle connects sales, onboarding, guest operations and continuous
improvement: audit the prospect, onboard the property, verify facts,
assist communication, track tasks and journeys, measure results, then
identify the next improvement.

**End of document.**
