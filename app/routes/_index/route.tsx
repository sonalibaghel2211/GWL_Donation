import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.container}>
        {/* Hero Card */}
        {showForm && (
          <div className={styles.heroCard}>
            <h1 className={styles.heroHeading}>Start Your Free Trial</h1>
            <p className={styles.heroSubtitle}>myshopify.com</p>
            
            <Form className={styles.form} method="post" action="/auth/login">
              <div className={styles.inputGroup}>
                <label htmlFor="shop" className={styles.inputLabel}>
                  Store URL
                </label>
                <input
                  id="shop"
                  className={styles.input}
                  type="text"
                  name="shop"
                  placeholder="my-store.myshopify.com"
                  required
                />
              </div>
              <button className={styles.button} type="submit">
                START YOUR FREE TRIAL
              </button>
            </Form>
          </div>
        )}

        {/* Features Section */}
        <div className={styles.featuresSection}>
          {/* Card 1: 7-Day Free Trial */}
          <div className={styles.featureCard}>
            <div className={styles.iconContainer}>
              <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#222222" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.featureIcon}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
                <polyline points="9 14 11 16 15 12"></polyline>
              </svg>
            </div>
            <h3 className={styles.cardTitle}>7-Day Free Trial</h3>
            <p className={styles.cardDescription}>
              We're proud to offer our customers a 7-Day Free Trial.
            </p>
          </div>

          {/* Card 2: Easy One-Click Setup */}
          <div className={styles.featureCard}>
            <div className={styles.iconContainer}>
              <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#222222" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.featureIcon}>
                <path d="M12 4a3 3 0 0 1 3 3" />
                <path d="M12 1a5 5 0 0 1 5 5" />
                <path d="M10 9.5V6a1.5 1.5 0 0 1 3 0v6.5" />
                <path d="M13 12.5V9.5a1.5 1.5 0 0 1 3 0v3" />
                <path d="M16 12.5V11a1.5 1.5 0 0 1 3 0v4a5 5 0 0 1-10 0V9.5" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Easy One-Click Setup</h3>
            <p className={styles.cardDescription}>
              Easy One-Click setup and broadcast everything in one setup.
            </p>
          </div>

          {/* Card 3: Native Shopify Integration */}
          <div className={styles.featureCard}>
            <div className={styles.iconContainer}>
              <svg viewBox="0 0 150 171" width="46" height="46" className={styles.featureIconShopify}>
                <path d="M136.2 46.5L108 40.2l-.9-2.9C104 22 93.6 11 81.3 11H52.5C40.2 11 29.8 22 26 37.3l-.9 2.9L3.4 46.5C1.5 47 0 48.7 0 50.8L9.9 160c1 14.2 12.6 25 26.8 25h99.9c14.2 0 25.8-10.8 26.8-25l9.9-109.2c.1-2.1-1.4-3.8-3.3-4.3z" fill="#95BF47"/>
                <path d="M136.2 46.5L108 40.2v144.8h28c14.2 0 25.8-10.8 26.8-25l9.9-109.2c.1-2.1-1.4-3.8-3.3-4.3z" fill="#5E8E3E"/>
                <path d="M72.9 66c-13.8 0-25.1 9.4-25.1 20.9 0 17 28.5 17 28.5 30.6 0 5.7-5.7 9.1-11.4 9.1-5.7 0-12.5-3.4-14.8-8l-9.1 5.7c3.4 8 12.5 13.6 23.9 13.6 13.8 0 25.1-9.4 25.1-20.9 0-17-28.5-17-28.5-30.6 0-5.7 5.7-9.1 11.4-9.1 5.7 0 12.5 3.4 14.8 8l9.1-5.7c-3.4-8-12.5-13.6-23.9-13.6z" fill="#FFFFFF"/>
                <path d="M52.5 18c3.5 0 6.6 2.1 7.6 5.2l.9 3h3c1 0 1.9.7 2.2 1.8l.9 2.9-22.1.1.9-2.9c.3-1.1 1.2-1.8 2.2-1.8h3l.9-3c1-3.1 4.1-5.2 7.6-5.2z" fill="#95BF47"/>
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Native Shopify Integration</h3>
            <p className={styles.cardDescription}>
              Native Shopify integration built specifically for Shopify stores.
            </p>
          </div>

          {/* Card 4: Recurring Donations */}
          <div className={styles.featureCard}>
            <div className={styles.iconContainer}>
              <svg viewBox="0 0 24 24" width="42" height="42" fill="none" stroke="#222222" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={styles.featureIcon}>
                <path d="M16.5 6A5 5 0 0 0 8 7.5" />
                <polyline points="7 6.5 7.5 9 10 8.5" />
                <path d="M12 13c-1.2-1.2-2.5-2.2-2.5-3.5a1.5 1.5 0 0 1 3 0 1.5 1.5 0 0 1 3 0c0 1.3-1.3 2.3-2.5 3.5z" fill="#51395C" stroke="#51395C" />
                <path d="M7 16h8.5a2 2 0 0 1 2 2v1H6.5v-1a2 2 0 0 1 2-2M6.5 18H5a1.5 1.5 0 0 1 0-3h1.5" />
              </svg>
            </div>
            <h3 className={styles.cardTitle}>Recurring Donations</h3>
            <p className={styles.cardDescription}>
              Allow customers to create recurring donations directly during checkout.
            </p>
          </div>
        </div>

        {/* Decorative Divider with Sparkles */}
        <div className={styles.dividerWrapper}>
          <hr className={styles.dividerLine} />
          <div className={styles.sparklesContainer}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" className={styles.sparkleIcon}>
              <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" fill="#EADBC8" />
              <path d="M19 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" fill="#EADBC8" />
            </svg>
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>Powered by <a href="https://www.galaxyweblinks.com/" target="_blank" rel="noopener noreferrer">Galaxy Weblinks Inc.</a></p>
        </footer>
      </div>
    </div>
  );
}
