import { Link } from 'react-router-dom';
import { paths } from '../../router';

export function PrivacyPolicyPage() {
  return (
    <main className="legal-page">
      <article className="legal-content">
        <header>
          <h1>Privacy Policy</h1>
          <p className="legal-meta">Last updated: October 2026</p>
        </header>

        <section>
          <h2>1. Introduction</h2>
          <p>
            AtollHost ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains
            how we collect, use, disclose, and safeguard your information when you use our property management
            platform ("the Service").
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide</h3>
          <ul>
            <li><strong>Account information:</strong> Name, email address, password (hashed), and organization details.</li>
            <li><strong>Property data:</strong> Property names, addresses, descriptions, photos, and amenities.</li>
            <li><strong>Guest communications:</strong> Messages, reviews, and interaction history with guests.</li>
            <li><strong>Content:</strong> Templates, guides, and other content you create within the Service.</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <ul>
            <li><strong>Usage data:</strong> Pages visited, features used, time spent, and interaction patterns.</li>
            <li><strong>Device information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
            <li><strong>Logs:</strong> Access timestamps, error reports, and performance metrics.</li>
          </ul>

          <h3>2.3 Third-Party Integrations</h3>
          <p>
            When you connect third-party services (e.g., Airbnb, Vrbo, email providers), we receive data
            authorized by you through OAuth or API credentials. We only access data necessary for the
            integration to function.
          </p>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>Provide, maintain, and improve the Service.</li>
            <li>Process transactions and send related communications (confirmations, invoices).</li>
            <li>Send service-related announcements, updates, and security alerts.</li>
            <li>Enable AI-assisted features (draft generation, content suggestions) with your consent.</li>
            <li>Monitor and analyze usage trends to improve user experience.</li>
            <li>Detect, prevent, and address technical issues, fraud, and security threats.</li>
            <li>Comply with legal obligations and enforce our Terms of Service.</li>
          </ul>
        </section>

        <section>
          <h2>4. AI Processing and Data</h2>
          <ul>
            <li>AI features process your property data, templates, and guest context to generate drafts.</li>
            <li>Data sent to AI providers is limited to what is necessary for the requested task.</li>
            <li>We do not use your data to train or improve AI models.</li>
            <li>AI-generated drafts are not sent to guests without your explicit approval.</li>
            <li>You can disable AI features in organization settings at any time.</li>
          </ul>
        </section>

        <section>
          <h2>5. Information Sharing</h2>
          <p>We do not sell your personal information. We may share information only:</p>
          <ul>
            <li><strong>With your consent:</strong> When you authorize sharing (e.g., guest communications).</li>
            <li><strong>With service providers:</strong> Vendors who perform services on our behalf (hosting, AI providers, analytics) under strict confidentiality agreements.</li>
            <li><strong>For legal reasons:</strong> When required by law, court order, or to protect rights and safety.</li>
            <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice.</li>
          </ul>
        </section>

        <section>
          <h2>6. Data Security</h2>
          <ul>
            <li>Data encrypted in transit (TLS 1.2+) and at rest (AES-256).</li>
            <li>Passwords hashed with bcrypt (never stored in plaintext).</li>
            <li>Role-based access control limits data access within organizations.</li>
            <li>Regular security assessments and penetration testing.</li>
            <li>Incident response plan for data breach notification.</li>
          </ul>
          <p>
            While we implement reasonable security measures, no method of transmission or electronic storage
            is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2>7. Data Retention</h2>
          <ul>
            <li>Account data: Retained while your account is active.</li>
            <li>Property and guest data: Retained for the duration of your business relationship plus 3 years for legal compliance.</li>
            <li>Usage logs: Retained for 12 months.</li>
            <li>Deleted account data: Purged within 30 days of deletion request, subject to legal holds.</li>
          </ul>
        </section>

        <section>
          <h2>8. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li>Access and obtain a copy of your personal data.</li>
            <li>Rectify inaccurate or incomplete data.</li>
            <li>Request deletion of your data (subject to legal obligations).</li>
            <li>Restrict or object to certain processing.</li>
            <li>Data portability (receive your data in a structured format).</li>
            <li>Withdraw consent for AI processing at any time.</li>
            <li>Lodge a complaint with a supervisory authority.</li>
          </ul>
          <p>
            To exercise these rights, contact us at <a href="mailto:privacy@atollhost.com">privacy@atollhost.com</a>.
          </p>
        </section>

        <section>
          <h2>9. International Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries other than your own. We ensure
            appropriate safeguards (Standard Contractual Clauses, adequacy decisions) for such transfers.
          </p>
        </section>

        <section>
          <h2>10. Children's Privacy</h2>
          <p>
            The Service is not directed to individuals under 18. We do not knowingly collect personal
            information from children. If you believe we have collected such information, please contact us.
          </p>
        </section>

        <section>
          <h2>11. Third-Party Links</h2>
          <p>
            The Service may contain links to third-party websites. We are not responsible for the privacy
            practices or content of those sites. We encourage you to review their privacy policies.
          </p>
        </section>

        <section>
          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by
            posting the new policy on this page and updating the "Last updated" date. Continued use of the
            Service constitutes acceptance.
          </p>
        </section>

        <section>
          <h2>13. Contact</h2>
          <p>
            For privacy-related questions or to exercise your rights, contact our Data Protection Officer at
            <a href="mailto:privacy@atollhost.com">privacy@atollhost.com</a>.
          </p>
        </section>

        <footer className="legal-footer">
          <Link to={paths.signUp}>Back to Sign Up</Link>
          <Link to={paths.termsOfService}>Terms of Service</Link>
        </footer>
      </article>
    </main>
  );
}