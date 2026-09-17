import type { LinksFunction, MetaFunction } from "react-router";
import DocumentLayout, {
  documentPageLinks,
} from "../components/DocumentLayout";

export const links: LinksFunction = () => documentPageLinks();

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | SmartDonate: Recurring & Receipts" },
    {
      name: "description",
      content:
        "Privacy Policy for the SmartDonate: Recurring & Receipts Shopify app by Galaxy Web Links, explaining how merchant and donor data is collected, used, and protected.",
    },
  ];
};

/**
 * Public route: /privacy-policy
 * No authentication / App Bridge required.
 */
export default function PrivacyPolicy() {
  return (
    <DocumentLayout
      title="Privacy Policy"
      updated="Last Updated: June 11, 2026"
      activePath="/privacy-policy"
    >
      <p>
        This Privacy Policy explains how Galaxy Web Links ("we," "us," or
        "our") collects, uses, stores, and protects personal data when you
        install or use the SmartDonate: Recurring &amp; Receipts application
        (the "App") on a Shopify store.
      </p>

      <section className="doc-section" aria-labelledby="s1">
        <h2 id="s1">1. Introduction</h2>
        <p>
          SmartDonate: Recurring &amp; Receipts helps Shopify merchants
          collect charitable donations, offer recurring giving options,
          generate donation receipts, and manage donor contributions through
          their Shopify storefronts.
        </p>
        <p>
          We are committed to protecting the privacy of merchants and their
          customers. This policy is designed to meet Shopify App Store
          requirements and to help you understand our data practices in
          accordance with applicable privacy laws, including the following:
        </p>
        <ul>
          <li>The General Data Protection Regulation (GDPR) and UK GDPR</li>
          <li>The California Privacy Rights Act (CPRA)</li>
          <li>The Virginia Consumer Data Protection Act (VCDPA)</li>
          <li>The Colorado Privacy Act (CPA)</li>
          <li>Other applicable federal, state, and international privacy regulations</li>
        </ul>
        <p>
          This Privacy Policy is provided for informational purposes only and
          does not constitute legal advice. If you have questions regarding
          your legal obligations, please consult a qualified legal
          professional.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s2">
        <h2 id="s2">2. Who This Policy Applies To</h2>
        <p>This Privacy Policy applies to:</p>
        <ul>
          <li>Merchants who install and use the app.</li>
          <li>Merchant staff who access the app through Shopify user accounts.</li>
          <li>
            Customers and donors who make one-time or recurring donations
            through a merchant's storefront.
          </li>
        </ul>
      </section>

      <section className="doc-section" aria-labelledby="s3">
        <h2 id="s3">3. Information We Collect Through Shopify APIs</h2>
        <p>
          When a merchant installs the app, we access certain information
          from the merchant's Shopify store through Shopify APIs, only as
          necessary to provide the app's functionality and within the
          permissions granted during installation. This may include:
        </p>
        <ul>
          <li>Store domain and shop identifier.</li>
          <li>Product and donation-related information.</li>
          <li>Donation campaign settings and configurations.</li>
          <li>
            Order information related to donations processed through Shopify
            (including order creation, payment confirmation, cancellations,
            and refunds).
          </li>
          <li>
            Recurring subscription contract details (creation, updates,
            billing attempt outcomes).
          </li>
          <li>App installation, authentication, session, and scope information.</li>
          <li>
            Billing and subscription plan information provided through
            Shopify's billing systems.
          </li>
        </ul>
        <p>
          We do not collect or store customers' payment card information.
          Payment processing is handled by Shopify and its authorized payment
          providers.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s4">
        <h2 id="s4">4. Information We Collect Directly From Merchants</h2>
        <p>When merchants use the App, we may collect and store:</p>
        <ul>
          <li>
            Merchant and staff account information available through Shopify
            authentication, such as name, email address, user ID, and
            locale.
          </li>
          <li>Donation campaign settings and configurations.</li>
          <li>Receipt templates and branding preferences.</li>
          <li>App usage information and administrative actions.</li>
          <li>Technical logs related to app performance, security, and troubleshooting.</li>
        </ul>
      </section>

      <section className="doc-section" aria-labelledby="s5">
        <h2 id="s5">5. Information We Collect From Customers and Donors</h2>
        <p>
          When customers or donors interact with donation features provided
          by the App, we may collect:
        </p>
        <ul>
          <li>Donor name.</li>
          <li>Email address.</li>
          <li>Donation amount.</li>
          <li>Donation frequency (one-time or recurring).</li>
          <li>Donation campaign or cause selected.</li>
          <li>Order identifier associated with the donation.</li>
          <li>Subscription contract identifier (for recurring donations).</li>
          <li>Receipt delivery preferences.</li>
          <li>Technical request metadata necessary to process donations and generate receipts.</li>
        </ul>
        <p>
          Customer information is collected solely to facilitate donation
          processing, recurring donation management, receipt generation,
          customer support, and compliance with applicable legal
          requirements.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s6">
        <h2 id="s6">6. Cookies and Tracking Technologies</h2>
        <p>
          The app does not use cookies, pixels, or similar tracking
          technologies to track, profile, or monitor customers or donors.
          Any cookies or similar technologies present during app usage are
          limited to those managed by Shopify for authentication, session
          management, and platform functionality and are governed by
          Shopify's own privacy policy.
        </p>
        <p>
          We do not use any third-party analytics or tracking scripts on
          merchant storefronts through the App.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s7">
        <h2 id="s7">7. How We Use Information</h2>
        <p>We use the information we collect solely to:</p>
        <ul>
          <li>Provide, operate, maintain, and improve the App.</li>
          <li>Process one-time and recurring donations.</li>
          <li>Generate and deliver donation receipts upon successful payment.</li>
          <li>Manage donation campaigns and reporting.</li>
          <li>
            Track and manage recurring donation subscription contracts,
            including billing outcomes.
          </li>
          <li>Handle order cancellations and refunds related to donations.</li>
          <li>Authenticate merchants and manage app subscriptions and billing plans.</li>
          <li>Respond to support requests.</li>
          <li>Monitor system performance and security.</li>
          <li>Comply with legal, tax, accounting, and regulatory obligations.</li>
          <li>
            Process data access, deletion, and redaction requests as
            required by privacy laws.
          </li>
        </ul>
        <p>
          We do not sell personal data. We do not use merchant or donor
          personal data for unrelated marketing purposes. We do not share
          personal data with third parties for their own marketing or
          advertising purposes.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s8">
        <h2 id="s8">
          8. Legal Basis for Processing (EEA/UK/Applicable Jurisdictions)
        </h2>
        <p>Where required by applicable law, we process personal data based on:</p>
        <ul>
          <li>
            Performance of a contract — to provide app services to merchants
            who install and use the app.
          </li>
          <li>
            Legitimate interests — in maintaining, securing, and improving
            the App, provided such interests are not overridden by data
            subjects' rights.
          </li>
          <li>
            Compliance with legal obligations — where we are required to
            process data by applicable law, regulation, or legal process.
          </li>
          <li>
            Consent — where required for optional features or
            communications. Where processing is based on consent, you have
            the right to withdraw your consent at any time by contacting us
            at the details provided in Section 16.
          </li>
        </ul>
      </section>

      <section className="doc-section" aria-labelledby="s9">
        <h2 id="s9">9. Data Sharing and Service Providers</h2>
        <p>
          We may share information with trusted service providers that help
          us operate the app, including:
        </p>
        <ul>
          <li>Cloud hosting and infrastructure providers — for hosting and running the app.</li>
          <li>Database providers — for secure data storage.</li>
          <li>
            Email delivery services (e.g., SendGrid) — used to send donation
            receipts and notifications.
          </li>
          <li>
            Analytics and monitoring providers — used to maintain service
            reliability and performance.
          </li>
        </ul>
        <p>
          These providers process data only on our behalf and under
          contractual obligations to protect personal information. We
          require that our service providers implement appropriate technical
          and organizational safeguards.
        </p>
        <p>
          We may also disclose information when required by law, legal
          process, or to protect the rights, property, or safety of Galaxy
          Web Links, merchants, donors, or others.
        </p>
        <p>We do not sell personal data to third parties.</p>
      </section>

      <section className="doc-section" aria-labelledby="s10">
        <h2 id="s10">10. International Data Transfers</h2>
        <p>
          Galaxy Web Links may process and store information in countries
          outside the country where merchants or donors are located,
          including outside the European Economic Area (EEA) and the United
          Kingdom.
        </p>
        <p>
          Where required, we implement appropriate safeguards for
          international transfers, including Standard Contractual Clauses
          (SCCs) or other lawful transfer mechanisms recognized under
          applicable data protection laws, to ensure that personal data
          receives an adequate level of protection.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s11">
        <h2 id="s11">11. Data Retention</h2>
        <p>
          We retain personal information only for as long as necessary to
          provide the App and fulfill legal obligations.
        </p>
        <ul>
          <li>
            Merchant account and configuration data are retained while the
            App remains installed. Upon uninstallation, merchant
            configuration data is deleted within 30 days, unless retention
            is required by law.
          </li>
          <li>
            Donation and receipt records may be retained for up to 7 years
            after the relevant transaction, as required for accounting,
            auditing, tax, and compliance purposes.
          </li>
          <li>
            Recurring subscription contract data is retained while the
            associated subscription is active and for the applicable
            retention period after cancellation.
          </li>
          <li>
            Donor information is retained only as long as necessary to
            provide App services and comply with applicable laws.
          </li>
          <li>
            Technical and webhook processing logs are retained for up to 90
            days and then deleted or anonymized.
          </li>
        </ul>
        <p>
          Upon uninstallation of the App, the App responds to Shopify's
          <code> app/uninstalled</code> webhook to clean up session data, and
          subsequently to the <code>shop/redact</code> webhook to process
          complete data deletion. Merchants may also request earlier
          deletion of their data by contacting us at the details provided in
          Section 16.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s12">
        <h2 id="s12">12. Data Subject Rights and Shopify Compliance</h2>
        <p>
          Depending on applicable laws (including the GDPR, UK GDPR, CPRA,
          VCDPA, and CPA), individuals may have rights to:
        </p>
        <ul>
          <li>Access their personal information.</li>
          <li>Correct inaccurate or incomplete information.</li>
          <li>Request deletion of personal information.</li>
          <li>Restrict or object to processing of personal information.</li>
          <li>
            Request data portability — receive personal data in a
            structured, commonly used, and machine-readable format.
          </li>
          <li>
            Withdraw consent at any time where processing is based on
            consent, without affecting the lawfulness of processing prior to
            withdrawal.
          </li>
          <li>
            Opt out of the sale of personal data — we do not sell personal
            data, but this right is acknowledged under applicable US state
            privacy laws.
          </li>
          <li>
            Lodge a complaint with a relevant data protection supervisory
            authority (for EEA/UK residents).
          </li>
        </ul>

        <h3>How to Exercise Your Rights</h3>
        <p>To exercise any of the above rights, please contact us at:</p>
        <p>
          Email:{" "}
          <a href="mailto:appsupport@galaxyweblinks.com">
            appsupport@galaxyweblinks.com
          </a>
        </p>
        <p>
          We will acknowledge your request within 10 business days and
          respond in full within 30 days, or as required by applicable law.
          We may need to verify your identity before fulfilling certain
          requests.
        </p>

        <h3>Shopify Mandatory Privacy Compliance Webhooks</h3>
        <p>
          The App fully implements Shopify's required privacy compliance
          webhooks to ensure automated handling of privacy-related requests:
        </p>
        <ul>
          <li>
            <code>customers/data_request</code> — Responds to requests from
            customers to access their personal data stored by the App.
          </li>
          <li>
            <code>customers/redact</code> — Deletes or anonymizes a
            customer's personal data from the App's systems upon request.
          </li>
          <li>
            <code>shop/redact</code> — Deletes all remaining merchant and
            associated customer data from the App's systems after app
            uninstallation and the expiration of the data retention period.
          </li>
        </ul>
        <p>
          These mechanisms help merchants comply with privacy obligations
          and data subject requests under applicable laws including GDPR, UK
          GDPR, CPRA, and other privacy regulations. Merchants remain
          responsible for handling customer privacy requests relating to
          their stores in accordance with their own privacy obligations.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s13">
        <h2 id="s13">13. Security</h2>
        <p>
          We implement reasonable administrative, technical, and
          organizational safeguards designed to protect personal
          information, including:
        </p>
        <ul>
          <li>Encrypted HTTPS connections for all data in transit.</li>
          <li>Access controls and authentication mechanisms.</li>
          <li>Secure hosting infrastructure.</li>
          <li>Regular monitoring and logging of security events.</li>
          <li>Role-based access to production systems and data.</li>
        </ul>
        <p>
          While we strive to protect personal information, no method of
          transmission or storage can be guaranteed to be completely secure.
          In the event of a data breach involving personal data, we will
          notify affected parties and relevant authorities as required by
          applicable law.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s14">
        <h2 id="s14">14. Children's Privacy</h2>
        <p>
          The App is intended for use by merchants operating Shopify stores
          and is not directed toward children under the age of 16 (or the
          applicable age of consent in relevant jurisdictions).
        </p>
        <p>
          We do not knowingly collect personal information from children. If
          we become aware that such information has been collected, we will
          take appropriate steps to delete it promptly.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s15">
        <h2 id="s15">15. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect
          changes in our services, legal obligations, or business practices.
        </p>
        <p>
          When material changes are made, we will update the "Last Updated"
          date at the top of this page and, where practicable, notify
          merchants through the App or by email. Continued use of the App
          after changes become effective constitutes acceptance of the
          updated policy.
        </p>
        <p>
          We encourage you to review this Privacy Policy periodically to
          stay informed about how we protect your information.
        </p>
      </section>

      <section className="doc-section" aria-labelledby="s16">
        <h2 id="s16">16. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, wish to exercise
          your data rights, or have concerns about our data handling
          practices, please contact:
        </p>
        <div className="doc-callout">
          <p style={{ margin: 0 }}>
            App: SmartDonate: Recurring &amp; Receipts
            <br />
            Company: Galaxy Web Links
            <br />
            Email:{" "}
            <a href="mailto:appsupport@galaxyweblinks.com">
              appsupport@galaxyweblinks.com
            </a>
            <br />
            Website:{" "}
            <a
              href="https://www.galaxyweblinks.com"
              target="_blank"
              rel="noreferrer"
            >
              https://www.galaxyweblinks.com
            </a>
            <br />
            Data Protection Inquiries:{" "}
            <a href="mailto:appsupport@galaxyweblinks.com">
              appsupport@galaxyweblinks.com
            </a>
          </p>
        </div>
        <p>
          For EEA/UK residents, if you are not satisfied with our response
          to your privacy concern, you have the right to lodge a complaint
          with your local data protection supervisory authority.
        </p>
        <p>&copy; 2026 Galaxy Web Links. All rights reserved.</p>
      </section>
    </DocumentLayout>
  );
}
