import { useState } from "react";
import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    return { shop: session.shop };
};

export default function HelpPage() {
    const { shop } = useLoaderData<typeof loader>();
    const [openIndex, setOpenIndex] = useState<number | null>(0);
    const faqs = [
        {
            question: "How do I enable the donation widgets in my store theme?",
            answer: (
                <s-stack direction="block" gap="base">
                    <s-text>To add donation widgets to your store storefront:</s-text>
                    <ol style={{ paddingLeft: "16px", margin: 0, lineHeight: 1.6, fontSize: "14px", color: "#6d7175" }}>
                        <li>Click this link to open the <a href={`https://${shop}/admin/themes/current/editor?context=apps`} target="_blank" rel="noopener noreferrer" style={{ color: "#005bd3", fontWeight: "600", textDecoration: "underline" }}>Shopify Theme Editor</a> (opens in parent window). Alternatively, you can open the Theme Editor directly from the <strong>Configuration</strong> tab in the app's dashboard (e.g., under Preset Donation, Portion of Sale, or Round-Up donation settings) by clicking the <strong>Configure Theme</strong> button.</li>
                        <li style={{ marginTop: "4px" }}>Navigate to the page template (e.g., Product page, Cart page, or homepage) using the top dropdown selector.</li>
                        <li style={{ marginTop: "4px" }}>In the left sidebar, click <strong>Add section</strong> or <strong>Add block</strong> where you want the widget to appear.</li>
                        <li style={{ marginTop: "4px" }}>Select the <strong>Apps</strong> tab in the search panel.</li>
                        <li style={{ marginTop: "4px" }}>Choose the widget you wish to add (e.g., <strong>Recurring Donation Toggle</strong>, <strong>Round Up Donation</strong>, or <strong>Donation Cart Page</strong>).</li>
                        <li style={{ marginTop: "4px" }}>Drag the block to your preferred position and click <strong>Save</strong> in the top-right corner.</li>
                    </ol>
                </s-stack>
            )
        },
        {
            question: "How many donation campaigns can a merchant create?",
            answer: (
                <s-stack direction="block" gap="base">
                    <s-text>Depending on your active pricing plan, you can create one or multiple donation campaigns:</s-text>
                    <ul style={{ paddingLeft: "16px", margin: 0, lineHeight: 1.6, fontSize: "14px", color: "#6d7175" }}>
                        <li><strong>Basic Plan:</strong> Limited to 1 active donation campaign.</li>
                        <li style={{ marginTop: "4px" }}><strong>Advanced Plan:</strong> Create unlimited donation campaigns.</li>
                        <li style={{ marginTop: "4px" }}><strong>Pro Plan:</strong> Create unlimited donation campaigns.</li>
                    </ul>
                    <s-banner tone="warning">
                        <span slot="title" style={{ fontWeight: 600 }}>Important Note</span>
                        <p style={{ margin: 0, fontSize: "13px" }}>
                            Please do not delete the donation products generated during installation, as this may cause errors. You can safely manage and update these products through the app's dashboard or Shopify's Products section.
                        </p>
                    </s-banner>
                </s-stack>
            )
        },
        {
            question: "Can we update the labels and descriptions of the donation option?",
            answer: "Yes, you can edit the title and description of your campaigns by clicking Edit next to any campaign in the Donation Campaigns list. In addition, you can customize widget-specific text and heading settings in the Shopify Theme Editor."
        },
        {
            question: "Can we customize or edit the recurring donation billing intervals?",
            answer: "Yes. Merchants can customize the recurring donation billing intervals (such as weekly, monthly, or specific intervals like 2 months, 3 months, or weeks) under the Recurring Subscriptions settings by editing the selling plan group to suit their store's requirements."
        },
        {
            question: "Can we have pre-determined donation amounts as options for the customer?",
            answer: "Yes, when creating or editing a Preset Donation campaign, you can define a list of fixed amounts for customers to choose from, and optionally allow them to enter a custom amount."
        },
        {
            question: "Do we have the ability to set a minimum donation amount?",
            answer: "Yes, for Portion of Sale donations, you can configure a minimum order value in the settings. The donation will only be calculated and applied if the order total meets or exceeds this minimum value."
        },
        {
            question: "What is Payment Recovery and how does it work?",
            answer: "Payment Recovery retries failed recurring subscription charges at set intervals. If all retries fail, it triggers your configured fallback action (e.g., Pause, Cancel, or Skip the billing cycle). You can view failed attempts and recovery status under the Billing Attempts page."
        },
        {
            question: "Can the donation block show when the cart is empty?",
            answer: "Yes. Enable the 'Show on Empty Cart' toggle in the dashboard configuration settings to keep the block visible when the cart is empty. If disabled, it only displays when items are added to the cart."
        },
        {
            question: "Where can I see my active pricing plan?",
            answer: "Your active pricing plan (Basic, Advanced, or Pro) and billing status are displayed directly on the app's home page dashboard."
        },
        {
            question: "Are customers and merchants notified when subscription status changes?",
            answer: "Yes. Confirmation emails are sent to the customer whenever a subscription is Paused, Resumed, or Cancelled. You can also customize notification settings and email templates in the Email Settings tab."
        },
        {
            question: "How are donations handled for Cash on Delivery (COD) orders?",
            answer: "Donations on orders with pending payments (such as Cash on Delivery) are not processed at order creation. Once the order is marked as Paid in your Shopify Admin, the app automatically receives the update, logs the donation, applies the appropriate tags, and sends the receipt email."
        },
        {
            question: "Can customers manage their subscriptions from emails?",
            answer: "Yes, all recurring subscription receipt and reminder emails contain a direct 'Manage Subscription' link redirecting them to their customer portal on your store."
        },
        {
            question: "Do customers get reminded before upcoming subscription renewals?",
            answer: "Yes, billing reminder emails showing the upcoming charge date and amount are automatically sent 3 days before renewal, including a link to manage their subscription."
        }
    ];

    return (
        <s-page heading="Help & Support">
            <section style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "40px" }}>
                <s-stack direction="block" gap="large-300">

                    <s-stack direction="block" gap="base">
                        <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "20px" }}>
                            <div style={{ marginBottom: "12px" }}>
                                <span style={{ fontSize: "20px", fontWeight: "700", color: "#202223" }}>Get In Touch With Us</span>
                            </div>
                            <s-box paddingBlockStart="base">
                                <s-text>
                                    Below is the list of our Frequently Asked Questions that will help you understand the application features and its configuration. If your question is not listed here or if you need custom assistance, please contact us:
                                </s-text>
                                <ul style={{ margin: "12px 0 0", paddingLeft: "20px", color: "#202223", fontSize: "14px", lineHeight: "1.8" }}>
                                    <li><strong>Developed By:</strong> Galaxy Weblinks</li>
                                    <li><strong>Email:</strong> <a href="mailto:appsupport@galaxyweblinks.com" target="_blank" rel="noopener noreferrer" style={{ color: "#005bd3", textDecoration: "none" }}>appsupport@galaxyweblinks.com
                                    </a></li>
                                    <li><strong>Website:</strong> <a href="https://www.galaxyweblinks.com" target="_blank" rel="noopener noreferrer" style={{ color: "#005bd3", textDecoration: "none" }}>https://www.galaxyweblinks.com</a></li>
                                </ul>
                            </s-box>

                            <div style={{ marginTop: "50px", marginBottom: "30px" }}>
                                <span style={{ fontSize: "20px", fontWeight: "700", color: "#202223" }}>Frequently Asked Questions</span>
                            </div>

                            <s-stack direction="block" gap="base">
                                {faqs.map((faq, index) => (
                                    <s-box
                                        key={index}
                                        padding="none"
                                        borderRadius="large-100"
                                        borderWidth="base"
                                    >
                                        <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                                            <button
                                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                                style={{
                                                    width: "100%",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center",
                                                    padding: "16px 20px",
                                                    background: "rgba(255, 255, 255, 1)",
                                                    border: "none",
                                                    cursor: "pointer",
                                                    textAlign: "left",
                                                    color: "#202223"
                                                }}
                                            >
                                                <span style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "15px", fontWeight: "600" }}>
                                                    {faq.question}
                                                </span>
                                                <span style={{ transform: openIndex === index ? "rotate(180deg)" : "none", transition: "transform 0.3s ease" }}>
                                                    <svg viewBox="0 0 20 20" style={{ width: "20px", height: "20px", fill: "#5c5f62" }}>
                                                        <path fillRule="evenodd" d="M13.098 8H6.902c-.751 0-1.172.854-.708 1.446l3.098 3.949c.353.45 1.063.45 1.416 0l3.098-3.949c.464-.592.043-1.446-.708-1.446Z" />
                                                    </svg>
                                                </span>
                                            </button>
                                            <div style={{
                                                display: "grid",
                                                gridTemplateRows: openIndex === index ? "1fr" : "0fr",
                                                transition: "grid-template-rows 0.35s ease"
                                            }}>
                                                <div style={{ overflow: "hidden" }}>
                                                    <s-box padding="large-100" paddingBlockStart="none">
                                                        <s-box paddingInlineStart="large-200">
                                                            {typeof faq.answer === "string" ? (
                                                                <span style={{ fontSize: "14px", color: "#6d7175", lineHeight: 1.6, display: "block", paddingBottom: "16px" }}>{faq.answer}</span>
                                                            ) : (
                                                                faq.answer
                                                            )}
                                                        </s-box>
                                                    </s-box>
                                                </div>
                                            </div>
                                        </section>
                                    </s-box>
                                ))}
                            </s-stack>
                        </section>
                    </s-stack>

                </s-stack>
            </section>

        </s-page>
    );
}

export const headers: HeadersFunction = (headersArgs) => {
    return boundary.headers(headersArgs);
};
