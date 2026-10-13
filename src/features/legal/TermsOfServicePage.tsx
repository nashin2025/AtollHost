import { Link } from 'react-router-dom';
import { paths } from '../../router';

export function TermsOfServicePage() {
  return (
    <main className="legal-page">
      <article className="legal-content">
        <header>
          <h1>Terms of Service</h1>
          <p className="legal-meta">Last updated: October 2026</p>
        </header>

        <section>
          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using AtollHost ("the Service"), you agree to be bound by these Terms of Service ("Terms").
            If you disagree with any part of these Terms, you may not access the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            AtollHost is a property management platform that helps hosts manage guest communications, tasks,
            reviews, and content across multiple properties. The Service includes AI-assisted drafting tools,
            automated workflows, and integration capabilities.
          </p>
        </section>

        <section>
          <h2>3. Accounts and Eligibility</h2>
          <ul>
            <li>You must be at least 18 years old to create an account.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You agree to provide accurate, current, and complete information during registration.</li>
            <li>Organization access is granted via invitation or by creating an organization after sign-up.</li>
          </ul>
        </section>

        <section>
          <h2>4. AI-Assisted Features</h2>
          <ul>
            <li>AI-generated drafts require human approval before being sent to guests.</li>
            <li>You are responsible for reviewing and verifying all AI-generated content before use.</li>
            <li>AtollHost does not guarantee the accuracy, completeness, or appropriateness of AI outputs.</li>
            <li>AI features are provided "as is" and may be modified or discontinued at any time.</li>
          </ul>
        </section>

        <section>
          <h2>5. User Content</h2>
          <p>
            You retain ownership of content you submit to the Service. By submitting content, you grant
            AtollHost a worldwide, non-exclusive, royalty-free license to use, reproduce, and display
            that content solely for the purpose of providing the Service.
          </p>
        </section>

        <section>
          <h2>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any unlawful purpose or in violation of these Terms.</li>
            <li>Attempt to gain unauthorized access to any portion of the Service.</li>
            <li>Interfere with or disrupt the Service or servers connected to the Service.</li>
            <li>Transmit viruses, malware, or other harmful code.</li>
            <li>Scrape, crawl, or extract data from the Service without permission.</li>
          </ul>
        </section>

        <section>
          <h2>7. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are owned by AtollHost and
            are protected by international copyright, trademark, and other intellectual property laws.
            These Terms do not grant you any rights to use AtollHost's trademarks or branding.
          </p>
        </section>

        <section>
          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service immediately, without prior
            notice or liability, for any reason including breach of these Terms. Upon termination, your
            right to use the Service ceases immediately.
          </p>
        </section>

        <section>
          <h2>9. Disclaimer of Warranties</h2>
          <p>
            The Service is provided "as is" and "as available" without warranties of any kind, whether
            express or implied, including but not limited to implied warranties of merchantability,
            fitness for a particular purpose, non-infringement, or course of performance.
          </p>
        </section>

        <section>
          <h2>10. Limitation of Liability</h2>
          <p>
            In no event shall AtollHost, its directors, employees, or agents be liable for any indirect,
            incidental, special, consequential, or punitive damages, including without limitation loss of
            profits, data, use, goodwill, or other intangible losses resulting from your use of the Service.
          </p>
        </section>

        <section>
          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction
            in which AtollHost operates, without regard to its conflict of law provisions.
          </p>
        </section>

        <section>
          <h2>12. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will provide notice of significant
            changes by posting the new Terms on this page and updating the "Last updated" date. Your
            continued use of the Service after any changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section>
          <h2>13. Contact</h2>
          <p>
            If you have questions about these Terms, please contact us at
            <a href="mailto:legal@atollhost.com">legal@atollhost.com</a>.
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