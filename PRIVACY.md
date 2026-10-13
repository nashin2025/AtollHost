# AtollHost Privacy Policy

**Effective Date:** October 13, 2026  
**Last Updated:** October 13, 2026  
**Version:** 1.0

---

## 1. Introduction

AtollHost ("we," "our," "us," or "the Service") is a multi-tenant digital-operations platform that helps agencies manage guest communications, property information, tasks, and AI-assisted workflows for guesthouses in the Maldives. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.

**We are committed to protecting your privacy.** This policy is written in plain language so you can understand what data we collect, why we collect it, and what choices you have.

If you have questions about this policy or our data practices, contact our Data Protection Officer at **privacy@atollhost.com** (to be confirmed).

---

## 2. Information We Collect

We collect information in three categories: information you provide directly, information collected automatically, and information from third parties.

### 2.1 Information You Provide Directly

| Category | Examples | Purpose |
|----------|----------|---------|
| **Account & Identity** | Name, email address, hashed password, organization name, role | Authentication, authorization, account management |
| **Property Data** | Property name, address, island/atoll, description, photos, amenities, check-in/out rules, policies, transfer schedules, FAQs, public-facing copy | Core service delivery — property management, guest communications, AI grounding |
| **Guest Communications** | Enquiry messages, conversation history, guest contact details (when you choose to enter/import them), review text, ratings | Enquiry management, guest communication, review response |
| **Content & Templates** | Message templates, journey templates, content calendar items, marketing copy | Workflow automation, content management |
| **Task & Workflow Data** | Task titles, descriptions, priorities, due dates, assignees, completion evidence, comments | Task management, team coordination |
| **Integration Credentials** | OAuth tokens, API keys, webhook secrets (stored encrypted, never in plaintext) | Third-party service connectivity |

[⚠️ **LEGAL REVIEW REQUIRED**] We do not collect sensitive personal data (health, biometric, racial/ethnic origin, political opinions, religious beliefs, sexual orientation, criminal convictions) by default. If your use case requires such data, you must have a lawful basis and explicit consent before entering it.

### 2.2 Information Collected Automatically

| Category | Examples | Purpose |
|----------|----------|---------|
| **Usage Analytics** | Pages visited, features used, time spent, interaction patterns, search queries, filter selections | Product improvement, UX optimization, feature prioritization |
| **Device & Technical Data** | Browser type/version, operating system, IP address, device identifiers, screen resolution, language settings | Security monitoring, fraud detection, debugging, compatibility |
| **Logs & Security Events** | Access timestamps, authentication events, error reports, performance metrics, API request/response metadata (redacted), audit log entries | Security, compliance, troubleshooting, abuse prevention |
| **AI Feature Telemetry** | Draft generation requests, validation outcomes, approval/rejection rates, model provider latency (no prompt/content stored) | AI quality monitoring, cost tracking, safety validation |

We use first-party analytics only. We do not use third-party tracking cookies, advertising identifiers, or cross-site tracking technologies.

### 2.3 Information from Third Parties

| Source | Data Received | Basis |
|--------|---------------|-------|
| **Channel Integrations** (Airbnb, Vrbo, email providers, PMS, WhatsApp Business, Google Business Profile) | Enquiry messages, booking data, availability, guest contact details, review notifications | Your explicit authorization via OAuth or API credentials; we request minimum necessary scopes |
| **AI Model Providers** (configured by your organization) | Generated draft content, validation results, token usage metrics | Your consent when enabling AI features; data sent limited to verified property facts + conversation context |
| **Payment Processors** (if billing added) | Transaction status, billing email, payment method token (no full card numbers) | Contractual necessity for subscription management |

**We do not purchase data from data brokers, advertising networks, or third-party data aggregators.**

---

## 3. How We Use Your Information

We process your information for the following specific purposes:

### 3.1 Service Delivery (Contractual Necessity)
- Authenticate you and enforce role-based access control (organization → property → capability)
- Store, retrieve, and display your property data, enquiries, conversations, tasks, and content
- Route messages through your configured channels (email, WhatsApp, SMS, PMS) only after your approval
- Generate AI-assisted drafts grounded **only** in your verified Property Brain facts and relevant conversation context
- Process integration webhooks and synchronize authorized data

### 3.2 Service Improvement (Legitimate Interest)
- Analyze usage patterns to identify confusing workflows, prioritize feature development, and optimize performance
- Monitor AI draft quality (approval/edit/rejection rates, validator outcomes) to improve prompts and guardrails
- Track integration health (success/failure rates, latency) to proactively detect issues

### 3.3 Security & Fraud Prevention (Legitimate Interest / Legal Obligation)
- Detect and prevent unauthorized access, credential stuffing, and cross-tenant data access attempts
- Monitor for suspicious patterns (unusual export volumes, repeated failed logins, API abuse)
- Maintain audit logs for accountability and incident investigation

### 3.4 Communications (Consent / Contractual)
- Send service-related emails: authentication codes, password resets, security alerts, billing notices, feature announcements
- Send marketing/promotional emails **only with your explicit opt-in consent** (separate from service communications)
- You can unsubscribe from marketing emails at any time; service emails cannot be opted out

### 3.5 Legal Compliance (Legal Obligation)
- Respond to lawful requests from authorities (court orders, regulatory inquiries)
- Enforce our Terms of Service and acceptable use policies
- Retain records as required by Maldives law and applicable international regulations

[⚠️ **LEGAL REVIEW REQUIRED**] We do not use your data for: training or improving AI models (yours or ours), advertising targeting, selling to third parties, or any purpose not listed above. If we add a new processing purpose, we will update this policy and notify you.

---

## 4. Legal Basis for Processing

[⚠️ **LEGAL REVIEW REQUIRED — CRITICAL FOR GDPR COMPLIANCE**]

| Processing Activity | Legal Basis (GDPR Art. 6) | Notes |
|---------------------|---------------------------|-------|
| Authentication & account management | Contract (Art. 6(1)(b)) | Necessary to provide the Service |
| Property & guest data storage | Contract (Art. 6(1)(b)) + Legitimate Interest (Art. 6(1)(f)) | Core service; tenant isolation enforced |
| AI draft generation | Consent (Art. 6(1)(a)) | You enable AI features per property; can disable anytime |
| Usage analytics | Legitimate Interest (Art. 6(1)(f)) | Pseudonymized; no profiling; opt-out available |
| Security monitoring & audit logs | Legitimate Interest (Art. 6(1)(f)) + Legal Obligation (Art. 6(1)(c)) | Essential for security; minimal personal data |
| Marketing emails | Consent (Art. 6(1)(a)) | Explicit opt-in required; easy unsubscribe |
| Legal request compliance | Legal Obligation (Art. 6(1)(c)) | Maldives law, GDPR (if EU guests), other applicable laws |
| International transfers | See Section 9 | SCCs, adequacy decisions, or consent |

For users in the Maldives, processing is governed by the Maldives Data Protection Act (when enacted) and applicable sectoral laws. For EU guests whose data you process through AtollHost, GDPR applies to that processing.

---

## 5. Data Sharing and Third-Party Processors

**We do not sell your personal information.** We share data only as follows:

### 5.1 Service Providers (Data Processors)
We engage vetted subprocessors under Data Processing Agreements (DPAs) that meet GDPR Article 28 requirements:

| Category | Providers (Examples) | Purpose | Location |
|----------|---------------------|---------|----------|
| **Hosting & Database** | Supabase (PostgreSQL, Auth, Storage, Edge Functions) | Core infrastructure | EU/US (configurable) |
| **AI Model Providers** | OpenAI, Anthropic, or self-hosted models (your choice) | Draft generation, validation | Per provider's data centers |
| **Email Delivery** | Resend, SendGrid, or similar | Transactional & marketing emails | EU/US |
| **Monitoring & Error Tracking** | Sentry, LogRocket, or similar | Error tracking, performance | EU/US |
| **Analytics** | Self-hosted (PostHog, Matomo) or first-party only | Product analytics | Your chosen region |

**Current Subprocessor List:** [TO BE MAINTAINED AND PUBLISHED SEPARATELY]

### 5.2 Authorized Integrations (Your Direction)
When you connect a third-party service (e.g., Airbnb, WhatsApp Business), data flows **at your direction** under your authorization. We are a data processor for this flow; the third party is a separate controller.

### 5.3 Legal Authorities
We disclose data only when legally compelled (court order, regulatory request) and will notify you unless prohibited by law.

### 5.4 Business Transfers
In a merger, acquisition, or asset sale, your data transfers as part of the business. We will notify you of any change in control and your rights.

[⚠️ **LEGAL REVIEW REQUIRED**] Subprocessor locations must be verified against your data residency requirements. If you require Maldives-only or EU-only processing, this must be configured at the infrastructure level.

---

## 6. International Data Transfers

[⚠️ **LEGAL REVIEW REQUIRED**]

AtollHost is a cloud service. Your data may be processed in countries outside the Maldives or your guests' home countries.

### 6.1 Transfer Mechanisms
- **Standard Contractual Clauses (SCCs):** Used for all transfers to subprocessors outside adequate jurisdictions
- **Adequacy Decisions:** We prefer subprocessors in countries with EU adequacy decisions (where applicable)
- **Your Consent:** For AI providers where no adequacy/SCCs exist, your enabling of AI features constitutes consent to the transfer

### 6.2 Hosting Region
**Default hosting region:** [TO BE CONFIRMED — e.g., EU (Frankfurt) or Singapore]  
You may request a specific region during onboarding if available. The actual region determines the default transfer framework.

### 6.3 Guest Data Considerations
If you host EU guests, their personal data (names, messages, contact details) enters our systems through you. As the data controller for guest data, **you are responsible for ensuring a lawful transfer basis** (e.g., SCCs with us, guest consent, or adequacy). Our DPA with you covers this.

---

## 7. Data Retention and Deletion

[⚠️ **LEGAL REVIEW REQUIRED** — Retention periods must be finalized with legal counsel]

| Data Category | Retention Period | Deletion Trigger |
|---------------|------------------|------------------|
| **Account & Profile** | Active + 3 years after account closure | Account deletion request or 3 years inactivity |
| **Property Data (Brain, rooms, policies)** | Active + 3 years after property archival | Property archive + 3 years |
| **Guest Communications (enquiries, conversations, messages)** | Business relationship + 3 years | Enquiry closure + 3 years, or guest deletion request |
| **Guest Contact Profiles** | As long as relevant to active enquiries + 1 year | Guest deletion request or 1 year after last interaction |
| **AI Drafts & Approvals** | 2 years from creation | Auto-purge after 2 years |
| **Usage Logs & Analytics** | 12 months | Rolling 12-month window |
| **Security & Audit Logs** | 3 years (extended for incidents) | 3 years; 7 years for security incidents |
| **Integration Credentials** | Active + 90 days after revocation | Revocation + 90-day grace period |
| **Backups** | 30-day rolling (daily), 12-month (monthly) | Per backup schedule; encrypted, access-controlled |
| **Deleted Account Data** | Purged within 30 days | Deletion request + 30 days (subject to legal holds) |

**Important:** Legal holds, regulatory requirements, or ongoing disputes may extend retention. You will be notified if your deletion request is delayed.

---

## 8. Your Rights

[⚠️ **LEGAL REVIEW REQUIRED** — Rights vary by jurisdiction; this section must be tailored]

Depending on your location and the applicable law, you may have the following rights:

| Right | Description | How to Exercise |
|-------|-------------|-----------------|
| **Access** | Request a copy of your personal data and processing details | Email privacy@atollhost.com; we respond within 30 days (GDPR) / 45 days (CCPA) |
| **Rectification** | Correct inaccurate or incomplete data | Edit in-app (profile, property data) or email for other data |
| **Deletion ("Right to be Forgotten")** | Request deletion of your data | Email us; we process within 30 days, subject to legal holds |
| **Restriction** | Limit how we process your data | Email us with specific processing activities to restrict |
| **Portability** | Receive your data in a structured, machine-readable format | Use in-app export (CSV/JSON) or request via email |
| **Objection** | Object to processing based on legitimate interest | Email us; we assess and respond |
| **Withdraw AI Consent** | Disable AI features and stop related processing | Organization Settings → AI Features → Disable (immediate) |
| **Opt-Out of Marketing** | Stop promotional emails | Unsubscribe link in every marketing email |
| **Complaint to Authority** | Lodge a complaint with a data protection authority | Maldives: [Authority TBD]; EU: your national DPA |

### For Property Owners (Guest Data)
If you are a property owner using AtollHost, **you are the data controller** for your guests' personal data. Your guests' rights requests (access, deletion, etc.) should be directed to **you**. We provide tools to help you respond (export, delete guest records) and will assist as your processor.

### Identity Verification
For security, we may require identity verification before fulfilling rights requests (e.g., email confirmation, signed declaration for deletion).

---

## 9. Cookies and Tracking Technologies

[⚠️ **LEGAL REVIEW REQUIRED** — Cookie consent implementation must match this policy]

### 9.1 Cookie Categories We Use

| Category | Purpose | Consent Required | Examples |
|----------|---------|------------------|----------|
| **Strictly Necessary** | Authentication, session management, security, load balancing | No (legitimate interest) | `sb-access-token`, `sb-refresh-token`, CSRF tokens |
| **Functionality** | Remember preferences (theme, language, sidebar state) | No (legitimate interest) | `theme`, `locale`, `sidebar-collapsed` |
| **Analytics** | Usage measurement, feature adoption, performance | **Yes (opt-in)** | `ph_session`, `ph_event` (PostHog, self-hosted) |
| **AI Features** | None — AI runs server-side | N/A | — |

### 9.2 Managing Cookies
- **Browser settings:** Block or delete cookies via your browser (may break authentication)
- **In-app toggle:** Settings → Privacy → Analytics (opt-in/out)
- **No third-party advertising cookies:** We do not use Google Analytics, Meta Pixel, or ad-tech tracking

### 9.3 Local Storage
We use `localStorage` for: UI preferences, draft persistence (unsent messages), offline queue. No personal data beyond your user ID and preferences.

---

## 10. Data Security

We implement industry-standard security measures appropriate to the sensitivity of your data:

| Measure | Implementation |
|---------|----------------|
| **Encryption in Transit** | TLS 1.2+ for all API, web, and database connections; HSTS enforced |
| **Encryption at Rest** | AES-256 for database (Supabase), object storage, backups |
| **Password Security** | bcrypt (cost factor 12+), never logged or stored in plaintext |
| **Access Control** | Row Level Security (RLS) on every tenant table; role-based capabilities; property-scoped permissions |
| **Secrets Management** | Supabase Vault / environment variables; no secrets in client bundles, repo, or logs |
| **AI Safety** | Prompt injection protection; output validation; human approval required for guest-facing sends; takeover blocks automation |
| **Scanner Safety** | SSRF protection (block private IPs, metadata endpoints); rate limits; robots.txt respect; no auth bypass |
| **File Uploads** | Type/size validation; MIME verification; signed URLs with expiry; malware scanning (where supported) |
| **Webhook Security** | Signature verification; timestamp validation; replay protection via idempotency keys |
| **Audit Logging** | Actor, action, resource, outcome, timestamp, correlation ID; redacted sensitive fields |
| **Incident Response** | Defined runbook: containment, credential rotation, evidence preservation, notification (72h GDPR), recovery, post-incident review |
| **Testing** | Automated RLS negative tests (cross-tenant, cross-property); penetration testing (annual); dependency scanning (CI) |

**Limitation:** No internet-connected system can guarantee 100% security. We continuously improve our controls and welcome responsible disclosure at **security@atollhost.com**.

---

## 11. Children's Privacy

[⚠️ **LEGAL REVIEW REQUIRED**]

AtollHost is a **business-to-business service** designed for guesthouse operators and their staff (ages 18+). We do not knowingly collect personal information from children under 18.

However, **guest communications may involve minors** (e.g., family bookings with children's names, ages, or special needs). As the data controller for guest data, **you are responsible for:**
- Obtaining parental/guardian consent where required by law (COPPA for US guests, GDPR-K for EU children, Maldives child protection laws)
- Not entering unnecessary children's data into AtollHost
- Responding to parental rights requests regarding their children's data

If you believe we have collected a child's data without proper authorization, contact us immediately at privacy@atollhost.com.

---

## 12. AI Processing — Additional Transparency

Given AtollHost's AI-assisted features, we provide extra detail:

### 12.1 What Data Goes to AI Providers
When you generate a draft, we send only:
- **Verified, unexpired Property Brain facts** relevant to the guest's question
- **Recent conversation context** (last 5-10 messages, redacted of sensitive data)
- **Your approved templates** for the draft type

We **never** send: full guest databases, unverified Scanner findings, internal notes, API keys, or other tenants' data.

### 12.2 AI Provider Data Handling
- **OpenAI/Anthropic:** Data retained per their API data usage policies (typically 30 days for abuse monitoring, not training)
- **Self-hosted models:** No data leaves your infrastructure
- **Training opt-out:** We use API endpoints that do not train on your data by default

### 12.3 Your Controls
- Enable/disable AI per property in Organization Settings
- Review and edit every draft before sending
- "Human takeover" pauses AI for a conversation until explicit handback
- Audit trail: every draft shows model, prompt version, source facts, validator result, approver

---

## 13. Third-Party Links

The Service may contain links to third-party websites (integration documentation, help centers, partner sites). We are not responsible for the privacy practices or content of those sites. We encourage you to review their privacy policies before providing any information.

---

## 14. Changes to This Policy

We may update this Privacy Policy to reflect changes in our practices, legal requirements, or product features.

### 14.1 Notification
- **Material changes:** 30 days' advance notice via email and in-app banner
- **Non-material changes:** Updated "Last Updated" date; policy available at this URL
- **Version history:** Available at `/legal/privacy/history` (to be implemented)

### 14.2 Your Options
If you disagree with a material change, you may:
- Contact us to discuss concerns
- Exercise your deletion right (Section 8)
- Stop using the Service (continuing use after notice period constitutes acceptance)

---

## 15. Contact Information

**Data Protection Officer:** [TO BE APPOINTED — NAME & CONTACT]  
**Privacy Email:** privacy@atollhost.com (to be configured)  
**Postal Address:** [COMPANY LEGAL ADDRESS — TO BE COMPLETED]  
**Security Email:** security@atollhost.com  

We aim to respond to privacy inquiries within **15 business days** (GDPR: 30 days; CCPA: 45 days).

---

## 16. Governing Law and Jurisdiction

[⚠️ **LEGAL REVIEW REQUIRED**]

This Privacy Policy is governed by the laws of **[COUNTRY/JURISDICTION — TO BE CONFIRMED]**. Disputes shall be resolved in the courts of **[CITY, COUNTRY]**, without prejudice to your rights under GDPR (if applicable) to lodge complaints with your local supervisory authority.

---

## 17. No Sale of Personal Information

We do not sell, rent, or trade your personal information to third parties for monetary or other consideration. This includes not sharing data with advertising networks, data brokers, or marketing partners.

---

## 18. California Privacy Rights (CCPA/CPRA)

[⚠️ **LEGAL REVIEW REQUIRED** — Only if serving California residents]

If you are a California resident, you have additional rights under CCPA/CPRA:
- Right to know categories of personal information collected, sources, purposes, and third parties shared with
- Right to delete (with exceptions)
- Right to opt-out of "sale" or "sharing" (we do not sell or share for cross-context behavioral advertising)
- Right to non-discrimination for exercising rights
- Right to limit use of sensitive personal information

To exercise these rights, email privacy@atollhost.com or use the in-app privacy dashboard. We verify requests using your account authentication.

---

## 19. Maldives-Specific Provisions

[⚠️ **LEGAL REVIEW REQUIRED** — MUST be reviewed by Maldives-qualified counsel]

As a service operating in/for the Maldives:
- We comply with the **Maldives Data Protection Act** (when enacted) and current sectoral privacy obligations
- **Tourism Act** obligations: Guest registration data may have specific retention/reporting requirements
- **MIRA (Tax) Compliance:** Tax profiles and transactions retained per Maldives tax law (minimum 5 years)
- **Green Tax:** Stay/guest-night records retained per Green Tax Regulations
- **Immigration:** Guest arrival/departure data handled per Controller General of Immigration requirements
- **Cross-border transfers:** Maldives may restrict certain data transfers; legal review required before enabling international subprocessors

---

## Pre-Publication Checklist

- [ ] Operator legal identity and contact approved
- [ ] Real data map and vendors verified
- [ ] AI provider terms, retention, and data-processing settings reviewed
- [ ] Hosting region and international transfer language verified
- [ ] Retention/deletion schedule implemented and documented
- [ ] Customer/guest roles and responsibilities reviewed
- [ ] Applicable Maldives and other relevant laws reviewed by qualified counsel
- [ ] Published notice matches implemented product behavior