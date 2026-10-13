import { Link } from 'react-router-dom';
import { paths } from '../../router';

export function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <article className="legal-content">
        <header>
          <h1>Privacy Policy</h1>
          <p className="legal-meta">Last updated: October 13, 2026</p>
        </header>

        <section>
          <h2>1. Introduction</h2>
          <p>
            AtollHost ("we", "our", "us", or "the Service") is a multi-tenant digital-operations
            platform that helps agencies manage guest communications, property information, tasks,
            and AI-assisted workflows for guesthouses in the Maldives. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you use our Service.
          </p>
          <p>
            We are committed to protecting your privacy. This policy is written in plain language so
            you can understand what data we collect, why we collect it, and what choices you have.
          </p>
          <p>
            If you have questions about this policy or our data practices, contact our Data
            Protection Officer at{' '}
            <a href="mailto:shannashin2018@gmail.com">shannashin2018@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <p>
            We collect information in three categories: information you provide directly,
            information collected automatically, and information from third parties.
          </p>

          <h3>2.1 Information You Provide Directly</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Examples</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Account and Identity</strong>
                  </td>
                  <td>Name, email address, hashed password, organization name, role</td>
                  <td>Authentication, authorization, account management</td>
                </tr>
                <tr>
                  <td>
                    <strong>Property Data</strong>
                  </td>
                  <td>
                    Property name, address, island/atoll, description, photos, amenities,
                    check-in/out rules, policies, transfer schedules, FAQs, public-facing copy
                  </td>
                  <td>
                    Core service delivery: property management, guest communications, AI grounding
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Guest Communications</strong>
                  </td>
                  <td>
                    Enquiry messages, conversation history, guest contact details (when you choose
                    to enter or import them), review text, ratings
                  </td>
                  <td>Enquiry management, guest communication, review response</td>
                </tr>
                <tr>
                  <td>
                    <strong>Content and Templates</strong>
                  </td>
                  <td>
                    Message templates, journey templates, content calendar items, marketing copy
                  </td>
                  <td>Workflow automation, content management</td>
                </tr>
                <tr>
                  <td>
                    <strong>Task and Workflow Data</strong>
                  </td>
                  <td>
                    Task titles, descriptions, priorities, due dates, assignees, completion
                    evidence, comments
                  </td>
                  <td>Task management, team coordination</td>
                </tr>
                <tr>
                  <td>
                    <strong>Integration Credentials</strong>
                  </td>
                  <td>
                    OAuth tokens, API keys, webhook secrets (stored encrypted, never in plaintext)
                  </td>
                  <td>Third-party service connectivity</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            We do not collect sensitive personal data (health, biometric, racial or ethnic origin,
            political opinions, religious beliefs, sexual orientation, criminal convictions) by
            default. If your use case requires such data, you must have a lawful basis and explicit
            consent before entering it.
          </p>

          <h3>2.2 Information Collected Automatically</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Examples</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Usage Analytics</strong>
                  </td>
                  <td>
                    Pages visited, features used, time spent, interaction patterns, search queries,
                    filter selections
                  </td>
                  <td>Product improvement, UX optimization, feature prioritization</td>
                </tr>
                <tr>
                  <td>
                    <strong>Device and Technical Data</strong>
                  </td>
                  <td>
                    Browser type/version, operating system, IP address, device identifiers, screen
                    resolution, language settings
                  </td>
                  <td>Security monitoring, fraud detection, debugging, compatibility</td>
                </tr>
                <tr>
                  <td>
                    <strong>Logs and Security Events</strong>
                  </td>
                  <td>
                    Access timestamps, authentication events, error reports, performance metrics,
                    API request/response metadata (redacted), audit log entries
                  </td>
                  <td>Security, compliance, troubleshooting, abuse prevention</td>
                </tr>
                <tr>
                  <td>
                    <strong>AI Feature Telemetry</strong>
                  </td>
                  <td>
                    Draft generation requests, validation outcomes, approval/rejection rates, model
                    provider latency (no prompt or content stored)
                  </td>
                  <td>AI quality monitoring, cost tracking, safety validation</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            We use first-party analytics only. We do not use third-party tracking cookies,
            advertising identifiers, or cross-site tracking technologies.
          </p>

          <h3>2.3 Information from Third Parties</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Data Received</th>
                  <th>Basis</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Channel Integrations</strong>
                  </td>
                  <td>
                    Enquiry messages, booking data, availability, guest contact details, review
                    notifications
                  </td>
                  <td>
                    Your explicit authorization via OAuth or API credentials; we request minimum
                    necessary scopes
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>AI Model Providers</strong>
                  </td>
                  <td>Generated draft content, validation results, token usage metrics</td>
                  <td>
                    Your consent when enabling AI features; data sent limited to verified property
                    facts plus conversation context
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Payment Processors</strong>
                  </td>
                  <td>
                    Transaction status, billing email, payment method token (no full card numbers)
                  </td>
                  <td>Contractual necessity for subscription management</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            We do not purchase data from data brokers, advertising networks, or third-party data
            aggregators.
          </p>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We process your information for the following specific purposes:</p>

          <h3>3.1 Service Delivery (Contractual Necessity)</h3>
          <ul>
            <li>
              Authenticate you and enforce role-based access control across organization, property,
              and capability levels.
            </li>
            <li>
              Store, retrieve, and display your property data, enquiries, conversations, tasks, and
              content.
            </li>
            <li>
              Route messages through your configured channels (email, WhatsApp, SMS, PMS) only after
              your approval.
            </li>
            <li>
              Generate AI-assisted drafts grounded only in your verified Property Brain facts and
              relevant conversation context.
            </li>
            <li>Process integration webhooks and synchronize authorized data.</li>
          </ul>

          <h3>3.2 Service Improvement (Legitimate Interest)</h3>
          <ul>
            <li>
              Analyze usage patterns to identify confusing workflows, prioritize feature
              development, and optimize performance.
            </li>
            <li>
              Monitor AI draft quality (approval, edit, and rejection rates, validator outcomes) to
              improve prompts and guardrails.
            </li>
            <li>
              Track integration health (success and failure rates, latency) to proactively detect
              issues.
            </li>
          </ul>

          <h3>3.3 Security and Fraud Prevention (Legitimate Interest / Legal Obligation)</h3>
          <ul>
            <li>
              Detect and prevent unauthorized access, credential stuffing, and cross-tenant data
              access attempts.
            </li>
            <li>
              Monitor for suspicious patterns (unusual export volumes, repeated failed logins, API
              abuse).
            </li>
            <li>Maintain audit logs for accountability and incident investigation.</li>
          </ul>

          <h3>3.4 Communications (Consent / Contractual)</h3>
          <ul>
            <li>
              Send service-related emails: authentication codes, password resets, security alerts,
              billing notices, feature announcements.
            </li>
            <li>
              Send marketing or promotional emails only with your explicit opt-in consent (separate
              from service communications).
            </li>
            <li>
              You can unsubscribe from marketing emails at any time; service emails cannot be opted
              out.
            </li>
          </ul>

          <h3>3.5 Legal Compliance (Legal Obligation)</h3>
          <ul>
            <li>
              Respond to lawful requests from authorities (court orders, regulatory inquiries).
            </li>
            <li>Enforce our Terms of Service and acceptable use policies.</li>
            <li>
              Retain records as required by Maldives law and applicable international regulations.
            </li>
          </ul>

          <p>
            We do not use your data for: training or improving AI models (yours or ours),
            advertising targeting, selling to third parties, or any purpose not listed above. If we
            add a new processing purpose, we will update this policy and notify you.
          </p>
        </section>

        <section>
          <h2>4. Legal Basis for Processing</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Processing Activity</th>
                  <th>Legal Basis (GDPR Art. 6)</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Authentication and account management</td>
                  <td>Contract (Art. 6(1)(b))</td>
                  <td>Necessary to provide the Service</td>
                </tr>
                <tr>
                  <td>Property and guest data storage</td>
                  <td>Contract (Art. 6(1)(b)) plus Legitimate Interest (Art. 6(1)(f))</td>
                  <td>Core service; tenant isolation enforced</td>
                </tr>
                <tr>
                  <td>AI draft generation</td>
                  <td>Consent (Art. 6(1)(a))</td>
                  <td>You enable AI features per property; can disable anytime</td>
                </tr>
                <tr>
                  <td>Usage analytics</td>
                  <td>Legitimate Interest (Art. 6(1)(f))</td>
                  <td>Pseudonymized; no profiling; opt-out available</td>
                </tr>
                <tr>
                  <td>Security monitoring and audit logs</td>
                  <td>
                    Legitimate Interest (Art. 6(1)(f)) plus Legal Obligation (Art. 6(1)(c))
                  </td>
                  <td>Essential for security; minimal personal data</td>
                </tr>
                <tr>
                  <td>Marketing emails</td>
                  <td>Consent (Art. 6(1)(a))</td>
                  <td>Explicit opt-in required; easy unsubscribe</td>
                </tr>
                <tr>
                  <td>Legal request compliance</td>
                  <td>Legal Obligation (Art. 6(1)(c))</td>
                  <td>Maldives law, GDPR (if EU guests), other applicable laws</td>
                </tr>
                <tr>
                  <td>International transfers</td>
                  <td>See Section 6</td>
                  <td>SCCs, adequacy decisions, or consent</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            For users in the Maldives, processing is governed by the Maldives Data Protection Act
            (when enacted) and applicable sectoral laws. For EU guests whose data you process
            through AtollHost, GDPR applies to that processing.
          </p>
        </section>

        <section>
          <h2>5. Data Sharing and Third-Party Processors</h2>
          <p>
            <strong>We do not sell your personal information.</strong> We share data only as
            follows:
          </p>

          <h3>5.1 Service Providers (Data Processors)</h3>
          <p>
            We engage vetted subprocessors under Data Processing Agreements (DPAs) that meet GDPR
            Article 28 requirements:
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Providers (Examples)</th>
                  <th>Purpose</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Hosting and Database</strong>
                  </td>
                  <td>Supabase (PostgreSQL, Auth, Storage, Edge Functions)</td>
                  <td>Core infrastructure</td>
                  <td>EU/US (configurable)</td>
                </tr>
                <tr>
                  <td>
                    <strong>AI Model Providers</strong>
                  </td>
                  <td>OpenAI, Anthropic, or self-hosted models (your choice)</td>
                  <td>Draft generation, validation</td>
                  <td>Per provider&rsquo;s data centers</td>
                </tr>
                <tr>
                  <td>
                    <strong>Email Delivery</strong>
                  </td>
                  <td>Resend, SendGrid, or similar</td>
                  <td>Transactional and marketing emails</td>
                  <td>EU/US</td>
                </tr>
                <tr>
                  <td>
                    <strong>Monitoring and Error Tracking</strong>
                  </td>
                  <td>Sentry, LogRocket, or similar</td>
                  <td>Error tracking, performance</td>
                  <td>EU/US</td>
                </tr>
                <tr>
                  <td>
                    <strong>Analytics</strong>
                  </td>
                  <td>Self-hosted (PostHog, Matomo) or first-party only</td>
                  <td>Product analytics</td>
                  <td>Your chosen region</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            A current subprocessor list will be published separately. If you have data
            residency requirements (for example, EU-only processing), contact us to discuss
            available options.
          </p>

          <h3>5.2 Authorized Integrations (Your Direction)</h3>
          <p>
            When you connect a third-party service (e.g., Airbnb, WhatsApp Business), data flows at
            your direction under your authorization. We are a data processor for this flow; the
            third party is a separate controller.
          </p>

          <h3>5.3 Legal Authorities</h3>
          <p>
            We disclose data only when legally compelled (court order, regulatory request) and will
            notify you unless prohibited by law.
          </p>

          <h3>5.4 Business Transfers</h3>
          <p>
            In a merger, acquisition, or asset sale, your data transfers as part of the business. We
            will notify you of any change in control and your rights.
          </p>
        </section>

        <section>
          <h2>6. International Data Transfers</h2>
          <p>
            AtollHost is a cloud service. Your data may be processed in countries outside the
            Maldives or your guests&rsquo; home countries.
          </p>

          <h3>6.1 Transfer Mechanisms</h3>
          <ul>
            <li>
              <strong>Standard Contractual Clauses (SCCs):</strong> Used for all transfers to
              subprocessors outside adequate jurisdictions.
            </li>
            <li>
              <strong>Adequacy Decisions:</strong> We prefer subprocessors in countries with EU
              adequacy decisions (where applicable).
            </li>
            <li>
              <strong>Your Consent:</strong> For AI providers where no adequacy or SCCs exist, your
              enabling of AI features constitutes consent to the transfer.
            </li>
          </ul>

          <h3>6.2 Hosting Region</h3>
          <p>
            Your data is hosted in the region configured for your organization. You may request a
            specific region during onboarding where available. The actual region determines the
            default transfer framework.
          </p>

          <h3>6.3 Guest Data Considerations</h3>
          <p>
            If you host EU guests, their personal data (names, messages, contact details) enters our
            systems through you. As the data controller for guest data, you are responsible for
            ensuring a lawful transfer basis (e.g., SCCs with us, guest consent, or adequacy). Our
            DPA with you covers this.
          </p>
        </section>

        <section>
          <h2>7. Data Retention and Deletion</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data Category</th>
                  <th>Retention Period</th>
                  <th>Deletion Trigger</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Account and Profile</strong>
                  </td>
                  <td>Active plus 3 years after account closure</td>
                  <td>Account deletion request or 3 years inactivity</td>
                </tr>
                <tr>
                  <td>
                    <strong>Property Data (Brain, rooms, policies)</strong>
                  </td>
                  <td>Active plus 3 years after property archival</td>
                  <td>Property archive plus 3 years</td>
                </tr>
                <tr>
                  <td>
                    <strong>Guest Communications (enquiries, conversations, messages)</strong>
                  </td>
                  <td>Business relationship plus 3 years</td>
                  <td>Enquiry closure plus 3 years, or guest deletion request</td>
                </tr>
                <tr>
                  <td>
                    <strong>Guest Contact Profiles</strong>
                  </td>
                  <td>As long as relevant to active enquiries plus 1 year</td>
                  <td>Guest deletion request or 1 year after last interaction</td>
                </tr>
                <tr>
                  <td>
                    <strong>AI Drafts and Approvals</strong>
                  </td>
                  <td>2 years from creation</td>
                  <td>Auto-purge after 2 years</td>
                </tr>
                <tr>
                  <td>
                    <strong>Usage Logs and Analytics</strong>
                  </td>
                  <td>12 months</td>
                  <td>Rolling 12-month window</td>
                </tr>
                <tr>
                  <td>
                    <strong>Security and Audit Logs</strong>
                  </td>
                  <td>3 years (extended for incidents)</td>
                  <td>3 years; 7 years for security incidents</td>
                </tr>
                <tr>
                  <td>
                    <strong>Integration Credentials</strong>
                  </td>
                  <td>Active plus 90 days after revocation</td>
                  <td>Revocation plus 90-day grace period</td>
                </tr>
                <tr>
                  <td>
                    <strong>Backups</strong>
                  </td>
                  <td>30-day rolling (daily), 12-month (monthly)</td>
                  <td>Per backup schedule; encrypted, access-controlled</td>
                </tr>
                <tr>
                  <td>
                    <strong>Deleted Account Data</strong>
                  </td>
                  <td>Purged within 30 days</td>
                  <td>Deletion request plus 30 days (subject to legal holds)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Legal holds, regulatory requirements, or ongoing disputes may extend retention. You will
            be notified if your deletion request is delayed.
          </p>
        </section>

        <section>
          <h2>8. Your Rights</h2>
          <p>
            Depending on your location and the applicable law, you may have the following rights:
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Right</th>
                  <th>Description</th>
                  <th>How to Exercise</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Access</strong>
                  </td>
                  <td>Request a copy of your personal data and processing details</td>
                  <td>
                    Email shannashin2018@gmail.com; we respond within 30 days (GDPR) or 45 days
                    (CCPA)
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Rectification</strong>
                  </td>
                  <td>Correct inaccurate or incomplete data</td>
                  <td>Edit in-app (profile, property data) or email for other data</td>
                </tr>
                <tr>
                  <td>
                    <strong>Deletion (Right to be Forgotten)</strong>
                  </td>
                  <td>Request deletion of your data</td>
                  <td>Email us; we process within 30 days, subject to legal holds</td>
                </tr>
                <tr>
                  <td>
                    <strong>Restriction</strong>
                  </td>
                  <td>Limit how we process your data</td>
                  <td>Email us with specific processing activities to restrict</td>
                </tr>
                <tr>
                  <td>
                    <strong>Portability</strong>
                  </td>
                  <td>Receive your data in a structured, machine-readable format</td>
                  <td>Use in-app export (CSV/JSON) or request via email</td>
                </tr>
                <tr>
                  <td>
                    <strong>Objection</strong>
                  </td>
                  <td>Object to processing based on legitimate interest</td>
                  <td>Email us; we assess and respond</td>
                </tr>
                <tr>
                  <td>
                    <strong>Withdraw AI Consent</strong>
                  </td>
                  <td>Disable AI features and stop related processing</td>
                  <td>Organization Settings, then AI Features, then Disable (immediate)</td>
                </tr>
                <tr>
                  <td>
                    <strong>Opt-Out of Marketing</strong>
                  </td>
                  <td>Stop promotional emails</td>
                  <td>Unsubscribe link in every marketing email</td>
                </tr>
                <tr>
                  <td>
                    <strong>Complaint to Authority</strong>
                  </td>
                  <td>Lodge a complaint with a data protection authority</td>
                  <td>Maldives: your local supervisory authority; EU: your national DPA</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>For Property Owners (Guest Data)</h3>
          <p>
            If you are a property owner using AtollHost, you are the data controller for your
            guests&rsquo; personal data. Your guests&rsquo; rights requests (access, deletion, etc.)
            should be directed to you. We provide tools to help you respond (export, delete guest
            records) and will assist as your processor.
          </p>

          <h3>Identity Verification</h3>
          <p>
            For security, we may require identity verification before fulfilling rights requests
            (e.g., email confirmation, signed declaration for deletion).
          </p>
        </section>

        <section>
          <h2>9. Cookies and Tracking Technologies</h2>
          <h3>9.1 Cookie Categories We Use</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Purpose</th>
                  <th>Consent Required</th>
                  <th>Examples</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Strictly Necessary</strong>
                  </td>
                  <td>Authentication, session management, security, load balancing</td>
                  <td>No (legitimate interest)</td>
                  <td>sb-access-token, sb-refresh-token, CSRF tokens</td>
                </tr>
                <tr>
                  <td>
                    <strong>Functionality</strong>
                  </td>
                  <td>Remember preferences (theme, language, sidebar state)</td>
                  <td>No (legitimate interest)</td>
                  <td>theme, locale, sidebar-collapsed</td>
                </tr>
                <tr>
                  <td>
                    <strong>Analytics</strong>
                  </td>
                  <td>Usage measurement, feature adoption, performance</td>
                  <td>Yes (opt-in)</td>
                  <td>ph_session, ph_event (PostHog, self-hosted)</td>
                </tr>
                <tr>
                  <td>
                    <strong>AI Features</strong>
                  </td>
                  <td>None: AI runs server-side</td>
                  <td>N/A</td>
                  <td>&mdash;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3>9.2 Managing Cookies</h3>
          <ul>
            <li>
              <strong>Browser settings:</strong> Block or delete cookies via your browser (may break
              authentication).
            </li>
            <li>
              <strong>In-app toggle:</strong> Settings, then Privacy, then Analytics (opt-in/out).
            </li>
            <li>
              <strong>No third-party advertising cookies:</strong> We do not use Google Analytics,
              Meta Pixel, or ad-tech tracking.
            </li>
          </ul>

          <h3>9.3 Local Storage</h3>
          <p>
            We use localStorage for: UI preferences, draft persistence (unsent messages), offline
            queue. No personal data beyond your user ID and preferences.
          </p>
        </section>

        <section>
          <h2>10. Data Security</h2>
          <p>
            We implement industry-standard security measures appropriate to the sensitivity of your
            data:
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Implementation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Encryption in Transit</strong>
                  </td>
                  <td>
                    TLS 1.2+ for all API, web, and database connections; HSTS enforced
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Encryption at Rest</strong>
                  </td>
                  <td>AES-256 for database (Supabase), object storage, backups</td>
                </tr>
                <tr>
                  <td>
                    <strong>Password Security</strong>
                  </td>
                  <td>
                    bcrypt (cost factor 12+), never logged or stored in plaintext
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Access Control</strong>
                  </td>
                  <td>
                    Row Level Security (RLS) on every tenant table; role-based capabilities;
                    property-scoped permissions
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Secrets Management</strong>
                  </td>
                  <td>
                    Supabase Vault / environment variables; no secrets in client bundles, repo, or
                    logs
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>AI Safety</strong>
                  </td>
                  <td>
                    Prompt injection protection; output validation; human approval required for
                    guest-facing sends; takeover blocks automation
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Scanner Safety</strong>
                  </td>
                  <td>
                    SSRF protection (block private IPs, metadata endpoints); rate limits; robots.txt
                    respect; no auth bypass
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>File Uploads</strong>
                  </td>
                  <td>
                    Type/size validation; MIME verification; signed URLs with expiry; malware
                    scanning (where supported)
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Webhook Security</strong>
                  </td>
                  <td>
                    Signature verification; timestamp validation; replay protection via idempotency
                    keys
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Audit Logging</strong>
                  </td>
                  <td>
                    Actor, action, resource, outcome, timestamp, correlation ID; redacted sensitive
                    fields
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Incident Response</strong>
                  </td>
                  <td>
                    Defined runbook: containment, credential rotation, evidence preservation,
                    notification (72h GDPR), recovery, post-incident review
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Testing</strong>
                  </td>
                  <td>
                    Automated RLS negative tests (cross-tenant, cross-property); penetration testing
                    (annual); dependency scanning (CI)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Limitation:</strong> No internet-connected system can guarantee 100% security.
            We continuously improve our controls and welcome responsible disclosure at{' '}
            <a href="mailto:security@atollhost.com">security@atollhost.com</a>.
          </p>
        </section>

        <section>
          <h2>11. Children&rsquo;s Privacy</h2>
          <p>
            AtollHost is a business-to-business service designed for guesthouse operators and their
            staff (ages 18+). We do not knowingly collect personal information from children under
            18.
          </p>
          <p>
            However, guest communications may involve minors (e.g., family bookings with
            children&rsquo;s names, ages, or special needs). As the data controller for guest data,
            you are responsible for:
          </p>
          <ul>
            <li>
              Obtaining parental/guardian consent where required by law (COPPA for US guests,
              GDPR-K for EU children, Maldives child protection laws).
            </li>
            <li>Not entering unnecessary children&rsquo;s data into AtollHost.</li>
            <li>
              Responding to parental rights requests regarding their children&rsquo;s data.
            </li>
          </ul>
          <p>
            If you believe we have collected a child&rsquo;s data without proper authorization,
            contact us immediately at{' '}
            <a href="mailto:shannashin2018@gmail.com">shannashin2018@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2>12. AI Processing: Additional Transparency</h2>
          <p>
            Given AtollHost&rsquo;s AI-assisted features, we provide extra detail:
          </p>

          <h3>12.1 What Data Goes to AI Providers</h3>
          <p>When you generate a draft, we send only:</p>
          <ul>
            <li>Verified, unexpired Property Brain facts relevant to the guest&rsquo;s question.</li>
            <li>
              Recent conversation context (last 5 to 10 messages, redacted of sensitive data).
            </li>
            <li>Your approved templates for the draft type.</li>
          </ul>
          <p>
            We never send: full guest databases, unverified Scanner findings, internal notes, API
            keys, or other tenants&rsquo; data.
          </p>

          <h3>12.2 AI Provider Data Handling</h3>
          <ul>
            <li>
              <strong>OpenAI/Anthropic:</strong> Data retained per their API data usage policies
              (typically 30 days for abuse monitoring, not training).
            </li>
            <li>
              <strong>Self-hosted models:</strong> No data leaves your infrastructure.
            </li>
            <li>
              <strong>Training opt-out:</strong> We use API endpoints that do not train on your data
              by default.
            </li>
          </ul>

          <h3>12.3 Your Controls</h3>
          <ul>
            <li>Enable or disable AI per property in Organization Settings.</li>
            <li>Review and edit every draft before sending.</li>
            <li>
              &ldquo;Human takeover&rdquo; pauses AI for a conversation until explicit handback.
            </li>
            <li>
              Audit trail: every draft shows model, prompt version, source facts, validator result,
              and approver.
            </li>
          </ul>
        </section>

        <section>
          <h2>13. Third-Party Links</h2>
          <p>
            The Service may contain links to third-party websites (integration documentation, help
            centers, partner sites). We are not responsible for the privacy practices or content of
            those sites. We encourage you to review their privacy policies before providing any
            information.
          </p>
        </section>

        <section>
          <h2>14. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy to reflect changes in our practices, legal
            requirements, or product features.
          </p>

          <h3>14.1 Notification</h3>
          <ul>
            <li>
              <strong>Material changes:</strong> 30 days&rsquo; advance notice via email and in-app
              banner.
            </li>
            <li>
              <strong>Non-material changes:</strong> Updated &ldquo;Last updated&rdquo; date; policy
              available at this URL.
            </li>
            <li>
              <strong>Version history:</strong> Will be published separately.
            </li>
          </ul>

          <h3>14.2 Your Options</h3>
          <p>If you disagree with a material change, you may:</p>
          <ul>
            <li>Contact us to discuss concerns.</li>
            <li>Exercise your deletion right (Section 8).</li>
            <li>
              Stop using the Service (continuing use after the notice period constitutes
              acceptance).
            </li>
          </ul>
        </section>

        <section>
          <h2>15. Contact Information</h2>
          <ul>
            <li>
              <strong>Data Protection Officer:</strong>{' '}
              <a href="mailto:shannashin2018@gmail.com">shannashin2018@gmail.com</a>
            </li>
            <li>
              <strong>Security:</strong>{' '}
              <a href="mailto:security@atollhost.com">security@atollhost.com</a>
            </li>
          </ul>
          <p>
            We aim to respond to privacy inquiries within 15 business days (GDPR: 30 days; CCPA: 45
            days).
          </p>
        </section>

        <section>
          <h2>16. Governing Law and Jurisdiction</h2>
          <p>
            This Privacy Policy is governed by applicable law, without prejudice to your rights
            under applicable data protection laws (including GDPR, where applicable) to lodge
            complaints with your local supervisory authority.
          </p>
        </section>

        <section>
          <h2>17. No Sale of Personal Information</h2>
          <p>
            We do not sell, rent, or trade your personal information to third parties for monetary
            or other consideration. This includes not sharing data with advertising networks, data
            brokers, or marketing partners.
          </p>
        </section>

        <section>
          <h2>18. California Privacy Rights (CCPA/CPRA)</h2>
          <p>If you are a California resident, you have additional rights under CCPA/CPRA:</p>
          <ul>
            <li>
              Right to know categories of personal information collected, sources, purposes, and
              third parties shared with.
            </li>
            <li>Right to delete (with exceptions).</li>
            <li>
              Right to opt-out of &ldquo;sale&rdquo; or &ldquo;sharing&rdquo; (we do not sell or
              share for cross-context behavioral advertising).
            </li>
            <li>Right to non-discrimination for exercising rights.</li>
            <li>Right to limit use of sensitive personal information.</li>
          </ul>
          <p>
            To exercise these rights, email shannashin2018@gmail.com or use the in-app privacy
            dashboard. We verify requests using your account authentication.
          </p>
        </section>

        <section>
          <h2>19. Maldives-Specific Provisions</h2>
          <p>As a service operating in and for the Maldives:</p>
          <ul>
            <li>
              We comply with the Maldives Data Protection Act (when enacted) and current sectoral
              privacy obligations.
            </li>
            <li>
              <strong>Tourism Act obligations:</strong> Guest registration data may have specific
              retention and reporting requirements.
            </li>
            <li>
              <strong>MIRA (tax) compliance:</strong> Tax profiles and transactions retained per
              Maldives tax law (minimum 5 years).
            </li>
            <li>
              <strong>Green Tax:</strong> Stay and guest-night records retained per Green Tax
              Regulations.
            </li>
            <li>
              <strong>Immigration:</strong> Guest arrival and departure data handled per Controller
              General of Immigration requirements.
            </li>
            <li>
              <strong>Cross-border transfers:</strong> Maldives may restrict certain data transfers;
              we review international subprocessors before enabling them.
            </li>
          </ul>
        </section>

        <footer className="legal-footer">
          <Link to={paths.signUp}>Back to Sign Up</Link>
          <Link to={paths.termsOfService}>Terms of Service</Link>
        </footer>
      </article>
    </main>
  );
}
