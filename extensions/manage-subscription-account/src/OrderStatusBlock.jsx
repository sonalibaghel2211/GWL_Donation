import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default async function (api) {
  try {
    render(<Extension api={api} />, document.body);
  } catch (err) {
    // Prevent unhandled errors from bubbling to Shopify's error boundary
    console.error('[ManageSubscription] Render error:', err);
  }
}

function Extension({ api }) {
  const [myshopifyDomain, setMyshopifyDomain] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  let customerId = '';
  if (api?.customer?.id) {
    customerId = api.customer.id.split('/').pop();
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchShopDomain() {
      try {
        const res = await fetch('shopify://customer-account/api/2026-01/graphql.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `query { shop { myshopifyDomain } }`
          }),
        });

        if (!res.ok) {
          throw new Error('GraphQL request failed with status ' + res.status);
        }

        const data = await res.json();

        if (cancelled) return;

        // Validate response structure
        const domain = data?.data?.shop?.myshopifyDomain;
        if (domain) {
          setMyshopifyDomain(domain);
        } else {
          // GraphQL returned successfully but no domain — may be a permissions issue
          console.warn('[ManageSubscription] No myshopifyDomain in response:', data);
          setError(true);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('[ManageSubscription] Failed to fetch shop domain:', err);
        setError(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchShopDomain();

    return () => { cancelled = true; };
  }, []);

  // While loading, render nothing (prevents Shopify from showing error)
  if (loading) return null;

  // If there was an error, render nothing silently instead of crashing
  if (error || !myshopifyDomain) return null;

  let subscriptionsUrl = `https://${myshopifyDomain}/apps/smart-donate-enhancement/subscriptions`;
  let receiptsUrl = `https://${myshopifyDomain}/apps/smart-donate-enhancement/receipts`;
  if (customerId) {
    subscriptionsUrl += `?logged_in_customer_id=${customerId}`;
    receiptsUrl += `?logged_in_customer_id=${customerId}`;
  }

  return (
    <s-stack direction="inline" gap="base">
      <s-button href={subscriptionsUrl}>
        Manage Subscription
      </s-button>
      <s-button href={receiptsUrl}>
        Donation Receipts
      </s-button>
    </s-stack>
  );
}