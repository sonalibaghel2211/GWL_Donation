import type { LinksFunction, MetaFunction } from "react-router";
import DocumentLayout, {
  documentPageLinks,
} from "../components/DocumentLayout";

export const links: LinksFunction = () => documentPageLinks();

export const meta: MetaFunction = () => {
  return [
    { title: "Feature Documentation | SmartDonate: Recurring & Receipts" },
    {
      name: "description",
      content:
        "Full feature documentation for the GWL Donations (SmartDonate: Recurring & Receipts) Shopify app, covering admin panel features, storefront blocks, and pricing plans.",
    },
  ];
};

/**
 * Public route: /documentation
 * No authentication / App Bridge required.
 */
export default function Documentation() {
  return (
    <DocumentLayout
      title="GWL Donations App — Feature Documentation"
      updated="Shopify Embedded App | Galaxy Weblinks | Prepared for Shopify App Store Submission, 2026"
      activePath="/documentation"
    >
      <section className="doc-section" aria-labelledby="section-a">
        <h2 id="section-a">Section A — Admin Panel Features</h2>

        <h3>1. Dashboard (Home)</h3>
        <ul>
          <li>
            Global App Status: master on/off toggle for all storefront
            donation blocks and processing.
          </li>
          <li>
            Active Pricing Plan Display: shows current plan (Basic,
            Advanced, Pro) and billing status.
          </li>
          <li>
            Performance Cards: totals for Preset Donation, Portion of Sale,
            Round-Up, and Recurring.
          </li>
          <li>Total Donation Amount: consolidated donation figure across all channels.</li>
          <li>
            Show on Empty Cart Toggle: controls whether the Cart Page
            donation widget shows with an empty cart.
          </li>
          <li>
            Giving Channels Shortcuts: quick links to manage settings and
            theme for each channel.
          </li>
          <li>
            Expert Assistance Panel: links to Contact Support and Rapid
            Support live chat.
          </li>
        </ul>

        <h3>2. Donation Preferences (Preset Donations)</h3>
        <ul>
          <li>
            Campaign Management: create, edit, enable/disable, and delete
            named donation campaigns shown on the Cart Page.
          </li>
          <li>
            Campaign Settings: title, description, image, display style
            (Tabs, Dropdown, Radio, Price Bar, Text Box), preset amounts,
            optional custom amount, recurring toggle, and live preview.
          </li>
        </ul>

        <h3>3. Portion of Sale Donation</h3>
        <ul>
          <li>
            Order-Based: percentage or fixed-amount donation on total order
            value, with custom message, tooltip, and order tag.
          </li>
          <li>
            Product-Based: donation triggered by specific products,
            percentage or fixed amount per product, with live preview.
          </li>
        </ul>

        <h3>4. Round-Up Donation</h3>
        <ul>
          <li>
            Round-Up: rounds cart total to the nearest $1, $5, $10, or fixed
            amount, with optional manual top-up.
          </li>
          <li>
            Customization: custom title, description, checkbox label,
            campaign image display, order tag, and live preview.
          </li>
        </ul>

        <h3>5. Recurring Donations</h3>
        <ul>
          <li>
            Setup: enable per campaign (auto-creates a Shopify selling
            plan); add PDP toggle block; Weekly or Monthly frequency. Merchants can edit and customize the recurring donation billing intervals (e.g., billing every 2 months, 3 months, or a specific number of weeks) under the Recurring Subscriptions settings by editing the selling plan group.
          </li>
          <li>
            Subscription Management: admin table of subscriptions with
            status, dates, and amount; Pause/Resume/Cancel with merchant
            email notification.
          </li>
          <li>
            Auto-Billing: automated weekly/monthly billing cron with receipt
            email and activity log on each order; reminder email 3 days
            before renewal.
          </li>
        </ul>

        <h3>6. Payment Recovery Settings</h3>
        <ul>
          <li>
            Retry &amp; Fallback: configurable retry attempts with fallback
            action (Pause, Cancel, or Skip) after max retries.
          </li>
          <li>
            Recovery Tracking: billing attempts log with error codes and
            timestamps; recovery status from Active Retrying to Exhausted.
          </li>
        </ul>

        <h3>7. Email Configuration</h3>
        <ul>
          <li>
            General Settings: contact email, optional CC email, and custom
            logo for all templates.
          </li>
        </ul>

        <div className="doc-table-wrap">
          <table className="doc-table">
            <caption>Email templates</caption>
            <thead>
              <tr>
                <th scope="col">Template</th>
                <th scope="col">Trigger</th>
                <th scope="col">Plan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Receipt</td>
                <td>Every successful donation</td>
                <td>All plans</td>
              </tr>
              <tr>
                <td>Refund</td>
                <td>Donation order refunded</td>
                <td>Advanced+</td>
              </tr>
              <tr>
                <td>Cancellation</td>
                <td>Subscription cancelled</td>
                <td>Pro only</td>
              </tr>
              <tr>
                <td>Pre-Deduction Reminder</td>
                <td>3 days before renewal</td>
                <td>Advanced+</td>
              </tr>
              <tr>
                <td>Payment Recovery</td>
                <td>Payment attempt fails/exhausted</td>
                <td>Pro only</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Template variables: name, email, currency/amount, order number,
          date, campaign name, frequency (Weekly/Monthly), next billing
          date.
        </p>

        <h3>8. Donation Activity</h3>
        <ul>
          <li>
            Activity Log: unified, filterable log (All / Preset / Recurring
            / Round-Up / POS) with date, order, type, amount, and status.
          </li>
          <li>
            Receipts: one-click resend, plus PDF download for all donation
            types; configurable 10/20/50 rows per page.
          </li>
        </ul>

        <h3>9. Track Donation (Analytics)</h3>
        <ul>
          <li>
            Analytics: monthly trend chart filterable by donation type and
            year, for spotting seasonal or campaign performance.
          </li>
        </ul>

        <h3>10. Pricing Plans</h3>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col">Basic $0.00/mo</th>
                <th scope="col">Advanced $4.99/mo</th>
                <th scope="col">Pro $9.99/mo</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Donation Campaigns</td>
                <td>Limit: 1 campaign</td>
                <td>Unlimited</td>
                <td>Unlimited</td>
              </tr>
              <tr>
                <td>Portion of Sale</td>
                <td>Fixed amount only</td>
                <td>Fixed &amp; Percentage</td>
                <td>Fixed &amp; Percentage</td>
              </tr>
              <tr>
                <td>Recurring Donations</td>
                <td>No</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Receipt Email</td>
                <td>Yes</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Refund Email</td>
                <td>No</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Pre-Deduction Reminder</td>
                <td>No</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Cancellation Email</td>
                <td>No</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Payment Recovery Email</td>
                <td>No</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Custom Email Templates</td>
                <td>No (view only)</td>
                <td>No (view only)</td>
                <td>Yes (full rich text editor)</td>
              </tr>
              <tr>
                <td>Branding Removal</td>
                <td>No (has branding)</td>
                <td>Yes (removed)</td>
                <td>Yes (removed)</td>
              </tr>
              <tr>
                <td>Custom Branding</td>
                <td>No</td>
                <td>No</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Filters &amp; Pagination</td>
                <td>No</td>
                <td>Yes</td>
                <td>Yes</td>
              </tr>
              <tr>
                <td>Donation Activity Logs</td>
                <td>Yes (no filters)</td>
                <td>Yes (with filters)</td>
                <td>Yes (with filters)</td>
              </tr>
              <tr>
                <td>Support</td>
                <td>Community</td>
                <td>Priority</td>
                <td>Priority + Rapid Chat</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Secure billing via Shopify. Cancel anytime.</p>
      </section>

      <section className="doc-section" aria-labelledby="section-b">
        <h2 id="section-b">Section B — Storefront &amp; Customer-Side Features</h2>

        <h3>11. Storefront Blocks (Theme Customizer)</h3>
        <ul>
          <li>
            Donation Cart Page: preset donation widget on the Cart Page
            (shown always if Show on Empty Cart is enabled).
          </li>
          <li>
            Round Up Donation: round-up widget with calculated donation and
            optional top-up, on the Cart Page.
          </li>
          <li>
            Portion of Sale Donation: Portion-of-Sale message on the Cart Page,
            calculated from cart total.
          </li>
          <li>
            Recurring Donation Toggle: One-Time/Recurring (Weekly/Monthly)
            selector on the Product Detail Page.
          </li>
          <li>
            Subscriptions Manager: customer portal block on the Customer
            Account page.
          </li>
        </ul>

        <h3>12–13. Customer Donation Flows</h3>
        <ul>
          <li>
            Preset Donation: select amount on Cart Page, click Donate; order
            tagged and logged; receipt email sent.
          </li>
          <li>
            Recurring Donation: select frequency and amount on PDP; shown in
            cart/checkout; order and customer tagged; auto-billed each cycle
            with receipt email; reminder email 3 days before renewal; manage
            via subscription portal.
          </li>
        </ul>

        <h3>14. Customer Subscription Portal</h3>
        <ul>
          <li>
            Self-Service: view, pause, resume, or cancel subscriptions;
            pause/resume/cancel notify both customer and merchant.
          </li>
          <li>
            Access &amp; Receipts: direct Manage Subscription link in every
            donation email; PDF receipt download for all donation types.
          </li>
        </ul>

        <h3>15. Cash on Delivery (COD) Donation Flow</h3>
        <ul>
          <li>
            Deferred Donations: no donation entry, tag, or receipt while a
            COD order is payment-pending; all are created once the order is
            marked Paid in Shopify Admin.
          </li>
        </ul>

        <h3>16. Post-Order Automation</h3>
        <ul>
          <li>
            Automated Pipeline: on confirmed payment: order tagged (and
            customer tagged for recurring), Donation Activity logged,
            receipt emailed, and Track Donation/Dashboard totals updated,
            across all donation types.
          </li>
        </ul>
      </section>

      <section className="doc-section" aria-labelledby="appendix-a">
        <h2 id="appendix-a">Appendix A — Subscription Tag Reference</h2>
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th scope="col">Tag Type</th>
                <th scope="col">Weekly</th>
                <th scope="col">Monthly</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Order Tag</td>
                <td>
                  <code>recurring_donation_weekly</code>
                </td>
                <td>
                  <code>recurring_donation_monthly</code>
                </td>
              </tr>
              <tr>
                <td>Customer Tag</td>
                <td>
                  <code>recurring_donor_weekly</code>
                </td>
                <td>
                  <code>recurring_donor_monthly</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>Galaxy Weblinks | 2026</p>
      </section>
    </DocumentLayout>
  );
}
