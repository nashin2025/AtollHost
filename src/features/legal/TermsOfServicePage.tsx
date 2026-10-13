import { Link } from 'react-router-dom';
import { paths } from '../../router';

export function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <article className="legal-content">
        <header>
          <h1>Terms of Service</h1>
          <p className="legal-meta">Last updated: October 13, 2026</p>
        </header>

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern use of the AtollHost service
            (&ldquo;the Service&rdquo;) between the legal entity operating AtollHost
            (&ldquo;AtollHost&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) and the organization or
            person accepting them (&ldquo;Customer&rdquo;, &ldquo;you&rdquo;). By creating an
            account or using the Service, you agree to these Terms. If you accept on behalf of an
            organization, you confirm that you have authority to bind that organization.
          </p>
        </section>

        <section>
          <h2>2. Service Description</h2>
          <p>AtollHost provides digital-operations tools for guesthouse operators, which may include:</p>
          <ul>
            <li>Property information management (descriptions, rooms, policies, amenities, FAQs).</li>
            <li>Enquiry and conversation tracking across connected channels.</li>
            <li>Task management and team coordination.</li>
            <li>AI-assisted draft generation with human approval.</li>
            <li>Review and content workflows.</li>
            <li>Reports and exports.</li>
            <li>Third-party integrations you choose to enable.</li>
          </ul>
          <p>
            <strong>What the Service is not.</strong> AtollHost is not a property management system
            (PMS), booking engine, channel manager, payment processor, accounting service, legal or
            tax adviser, or government filing agent unless a separate written agreement explicitly
            states otherwise. A draft, export, or record you create in the Service is a working
            document: creating it does not mean a booking, payment, government filing, or external
            publication has occurred.
          </p>
          <p>
            Feature availability depends on your plan, configuration, permissions, and the
            integrations you have enabled.
          </p>
        </section>

        <section>
          <h2>3. Accounts and Access</h2>
          <ul>
            <li>You must provide accurate account information and keep it current.</li>
            <li>
              You are responsible for protecting your credentials and must promptly report suspected
              compromise.
            </li>
            <li>
              Organization administrators are responsible for granting appropriate access and
              removing access when a user no longer needs it.
            </li>
            <li>Users may only access the properties and data they are authorized to access.</li>
          </ul>
        </section>

        <section>
          <h2>4. Your Responsibilities</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>
              Ensuring you have the rights, permissions, and lawful basis to submit guest, staff,
              property, review, and message data to the Service.
            </li>
            <li>
              Keeping property facts, policies, rates, availability, transfer schedules, and
              public-facing claims accurate and current.
            </li>
            <li>Reviewing AI-generated content before sending or publishing it.</li>
            <li>Obtaining required consent and honoring communication opt-outs.</li>
            <li>
              Ensuring your staff use the Service in compliance with applicable laws, platform
              terms, and third-party agreements.
            </li>
            <li>
              Verifying tax, tourism, immigration, and other regulatory obligations with appropriate
              official sources or advisers.
            </li>
          </ul>
        </section>

        <section>
          <h2>5. AI-Assisted Features</h2>
          <ul>
            <li>
              AI output is probabilistic and may be incomplete, outdated, or incorrect. It is
              provided as assistance, not a guarantee of accuracy.
            </li>
            <li>
              You must review generated content before use, and you must not rely on AI alone for
              safety-critical, financial, legal, refund or cancellation, availability, or regulatory
              decisions.
            </li>
            <li>Guest-facing AI drafts require human approval before sending.</li>
            <li>
              You remain responsible for all final communications and commitments made in your name.
            </li>
            <li>
              You can enable or disable AI features per property in organization settings at any
              time.
            </li>
          </ul>
        </section>

        <section>
          <h2>6. Third-Party Services and Integrations</h2>
          <p>
            Integrations are subject to third-party availability, terms, permission scopes, and API
            changes. A provider may revoke access or change its service, and we are not responsible
            for third-party systems beyond the responsibilities set out in these Terms. We only
            describe the Service as integrated with a provider when the relevant feature is
            implemented and enabled.
          </p>
        </section>

        <section>
          <h2>7. Customer Data and Privacy</h2>
          <ul>
            <li>
              You retain ownership of the data you submit. You grant us a limited license to store,
              process, and display that data as needed to provide and improve the Service.
            </li>
            <li>
              We process personal data as described in our <Link to={paths.privacyPolicy}>Privacy Policy</Link>. Any
              data-processing terms are set out there and in any separate written agreement.
            </li>
            <li>You must not upload unlawful, malicious, or unnecessary sensitive data.</li>
            <li>
              We will not use your data for purposes not disclosed in our Privacy Policy or these
              Terms.
            </li>
          </ul>
        </section>

        <section>
          <h2>8. Acceptable Use</h2>
          <p>You must not:</p>
          <ul>
            <li>
              Use the Service for any unlawful purpose or in violation of these Terms.
            </li>
            <li>
              Attempt to gain unauthorized access to any part of the Service or circumvent its
              security controls.
            </li>
            <li>Interfere with other tenants&rsquo; use of the Service.</li>
            <li>Send unlawful or unsolicited communications.</li>
            <li>Upload malware or other harmful code.</li>
            <li>
              Violate third-party platform rules, including marketplace and messaging provider terms.
            </li>
            <li>
              Use the Service to make deceptive claims about properties, availability, or pricing.
            </li>
          </ul>
          <p>
            We may suspend access when reasonably necessary to protect users, the Service, or legal
            obligations. Except in an emergency, we will give notice and, where practical, an
            opportunity to resolve the issue first.
          </p>
        </section>

        <section>
          <h2>9. Availability, Support, and Changes</h2>
          <ul>
            <li>
              Support channels, hours, and any service levels are as agreed in writing. We do not
              offer an uptime commitment unless one is expressly agreed in writing.
            </li>
            <li>
              We may update, change, or discontinue features. We will give reasonable advance notice
              of material changes that materially reduce functionality you actively use.
            </li>
            <li>Scheduled maintenance may temporarily affect availability.</li>
          </ul>
        </section>

        <section>
          <h2>10. Fees and Taxes</h2>
          <p>
            Pricing, billing cycle, payment methods, refunds, and suspension for non-payment are
            described in your applicable plan or order form. Fees are exclusive of taxes, and you are
            responsible for applicable taxes, levies, and duties imposed by taxing authorities.
          </p>
        </section>

        <section>
          <h2>11. Intellectual Property</h2>
          <ul>
            <li>
              We retain all rights in the AtollHost software, service materials, and branding. These
              Terms grant you a limited right to use the Service, not ownership of it.
            </li>
            <li>
              You retain rights to the content you submit, subject to the limited license in
              Section 7 needed to provide the Service.
            </li>
            <li>Third-party software and assets remain subject to their own licenses.</li>
          </ul>
        </section>

        <section>
          <h2>12. Suspension and Termination</h2>
          <ul>
            <li>
              You may stop using the Service at any time. Termination rights and any minimum term are
              as described in your plan or order form.
            </li>
            <li>
              We may suspend or terminate your access for material breach, non-payment, or legal
              requirement. Suspension for security or abuse reasons will be proportionate to the risk
              and documented.
            </li>
            <li>
              On termination, you may export your data during the export window stated in your plan.
              After that window, data is deleted according to the retention schedule in our Privacy
              Policy, subject to legal holds.
            </li>
            <li>Any unpaid invoices remain due.</li>
          </ul>
        </section>

        <section>
          <h2>13. Disclaimers and Limitation of Liability</h2>
          <ul>
            <li>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the
              maximum extent permitted by law, we disclaim implied warranties of merchantability,
              fitness for a particular purpose, and non-infringement.
            </li>
            <li>
              To the extent permitted by law, we are not liable for indirect, incidental, special,
              consequential, or punitive damages, or for loss of profits, data, goodwill, or business
              interruption.
            </li>
            <li>
              Nothing in these Terms waives rights that cannot legally be waived, and nothing limits
              liability for fraud, gross negligence, or willful misconduct where such limitation is
              prohibited by law.
            </li>
          </ul>
        </section>

        <section>
          <h2>14. Governing Law and Disputes</h2>
          <p>
            These Terms are governed by the laws of the jurisdiction in which the Provider operates,
            without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2>15. Changes to These Terms</h2>
          <ul>
            <li>
              We may update these Terms to reflect changes in the Service, the law, or our practices.
            </li>
            <li>
              Material changes take effect at least 30 days after notice by email or in-app notice.
            </li>
            <li>
              Non-material changes take effect when posted with an updated &ldquo;Last
              updated&rdquo; date.
            </li>
            <li>
              If you disagree with a material change, you may contact us and stop using the Service.
              Continuing to use the Service after the notice period constitutes acceptance.
            </li>
          </ul>
        </section>

        <section>
          <h2>16. Contact Us</h2>
          <p>
            If you have questions about these Terms, contact us at{' '}
            <a href="mailto:shannashin2018@gmail.com">shannashin2018@gmail.com</a>.
          </p>
        </section>

        <footer className="legal-footer">
          <Link to={paths.signUp}>Back to Sign Up</Link>
          <Link to={paths.privacyPolicy}>Privacy Policy</Link>
        </footer>
      </article>
    </main>
  );
}
