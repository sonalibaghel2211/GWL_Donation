import '@shopify/ui-extensions/preact';
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export default async function (api) {
  render(<Extension api={api} />, document.body);
}

function Extension({ api }) {
  const [myshopifyDomain, setMyshopifyDomain] = useState(null);

  let customerId = '';
  if (api?.customer?.id) {
    customerId = api.customer.id.split('/').pop();
  }

  useEffect(() => {
    // Fetch shop domain via Customer Account API GraphQL
    fetch('shopify://customer-account/api/2026-01/graphql.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { shop { myshopifyDomain } }`
      }),
    })
      .then(res => res.json())
      .then(data => {
        const domain = data?.data?.shop?.myshopifyDomain;
        if (domain) setMyshopifyDomain(domain);
      })
      .catch(console.error);
  }, []);

  // While loading, don't render the button (or render disabled)
  if (!myshopifyDomain) return null;

  let subscriptionsUrl = `https://${myshopifyDomain}/apps/pos-donation/subscriptions`;
  if (customerId) {
    subscriptionsUrl += `?logged_in_customer_id=${customerId}`;
  }

  return (
    <s-button href={subscriptionsUrl} external={true}>
      Manage Subscription
    </s-button>
  );
}