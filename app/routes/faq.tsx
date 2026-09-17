import type { LinksFunction, MetaFunction } from "react-router";
import DocumentLayout, {
  documentPageLinks,
} from "../components/DocumentLayout";

export const links: LinksFunction = () => documentPageLinks();

export const meta: MetaFunction = () => {
  return [
    { title: "FAQ | SmartDonate: Recurring & Receipts" },
    {
      name: "description",
      content:
        "Frequently asked questions about the SmartDonate app for Shopify: donation types, recurring donations, payment recovery, subscriptions, and support.",
    },
  ];
};

interface FaqItem {
  question: string;
  answer: JSX.Element;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question:
      "1. What is Smart Donation and what donation types does it support?",
    answer: (
      <>
        <p>
          Smart Donation helps Shopify merchants collect donations through
          four methods:
        </p>
        <ul>
          <li>Preset Donations – Fixed or custom donation amounts.</li>
          <li>
            Portion of Sale (POS) – Donate a percentage or fixed amount from
            orders or products.
          </li>
          <li>Round-Up Donations – Round the cart total and donate the difference.</li>
          <li>Recurring Donations – Weekly or monthly subscription-based donations.</li>
        </ul>
      </>
    ),
  },
  {
    question: "2. How do I create my first donation campaign?",
    answer: (
      <p>
        Navigate to Preset Donations, create a new campaign, add a title,
        description, and optional image, configure donation amounts, choose
        a display style, and review the live preview before publishing.
      </p>
    ),
  },
  {
    question: "3. How do recurring donations work?",
    answer: (
      <p>
        Customers can choose Weekly or Monthly recurring donations from
        supported storefront widgets. The app automatically processes
        recurring charges, sends reminder emails before renewal, and
        delivers receipts after successful payments.
      </p>
    ),
  },
  {
    question: "4. What happens if a recurring payment fails?",
    answer: (
      <p>
        The app automatically retries failed payments based on your
        configured recovery settings. If all retry attempts fail, the
        subscription can be automatically Paused, Cancelled, or Skipped,
        depending on your selected fallback option.
      </p>
    ),
  },
  {
    question: "5. Can customers manage their own subscriptions?",
    answer: (
      <p>
        Yes. Customers can access a self-service subscription portal where
        they can view, pause, resume, or cancel subscriptions and download
        donation receipts.
      </p>
    ),
  },
  {
    question: "6. How are donations handled for Cash on Delivery (COD) orders?",
    answer: (
      <p>
        For COD orders, donation records, receipts, and tags are created
        only after the order has been marked as paid. This ensures
        donations are processed only after payment is confirmed.
      </p>
    ),
  },
  {
    question: "7. Where can I track donation activity and performance?",
    answer: (
      <>
        <p>You can monitor donation performance through:</p>
        <ul>
          <li>Dashboard – Donation totals across all donation types.</li>
          <li>
            Donation Activity – Complete donation history, receipts, and
            status tracking.
          </li>
          <li>
            Analytics – Donation trends and performance reports with filters
            by donation type and year.
          </li>
        </ul>
      </>
    ),
  },
  {
    question: "8. How can I contact support?",
    answer: (
      <p>
        If you need assistance with setup, configuration, or
        troubleshooting, you can contact our support team directly from the
        Contact Support section within the app.
      </p>
    ),
  },
];

/**
 * Public route: /faq
 * No authentication / App Bridge required.
 */
export default function Faq() {
  return (
    <DocumentLayout
      title="Smart Donation App – Frequently Asked Questions"
      activePath="/faq"
    >
      <section className="doc-section" aria-label="Frequently asked questions">
        {FAQ_ITEMS.map((item) => (
          <details className="doc-faq-item" key={item.question}>
            <summary>{item.question}</summary>
            <div className="doc-faq-item__body">{item.answer}</div>
          </details>
        ))}
      </section>
    </DocumentLayout>
  );
}
