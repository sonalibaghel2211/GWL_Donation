// import { useState } from "react";
// import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
// import { boundary } from "@shopify/shopify-app-react-router/server";
// import { authenticate } from "../shopify.server";

// export const loader = async ({ request }: LoaderFunctionArgs) => {
//     await authenticate.admin(request);
//     return null;
// };

// const faqs = [
//     {
//         question: "How many donations can a merchant create?",
//         answer: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pharetra hendrerit ut duis sem. Suspendisse potenti."
//     },
//     {
//         question: "Is it required to register the organization at your end? How many Organization does it support?",
//         answer: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Phasellus tincidunt elit purus, sed bibendum enim tristique eget."
//     },
//     {
//         question: "Is it required to have organizations/firms/charity institutions from specific countries?",
//         answer: "Curabitur eget lectus at lorem accumsan faucibus. In elementum lacus eget tortor pretium imperdiet. Praesent fermentum accumsan aliquet."
//     },
//     {
//         question: "Can we update the labels and descriptions of the donation option?",
//         answer: "Nullam sollicitudin interdum dolor, at bibendum justo sollicitudin tristique. Maecenas sed lectus in dui vehicula placerat ut feugiat neque."
//     },
//     {
//         question: "Can we have the Pre-determined donation amount as options given to the customer?",
//         answer: "Aenean ullamcorper efficitur leo nec faucibus. Vestibulum suscipit velit tellus, feugiat tincidunt erat auctor ut."
//     },
//     {
//         question: "Do we have the ability to set a minimum donation amount?",
//         answer: "Nunc at dolor ac nisi dictum commodo sed id risus. Morbi gravida nunc varius ex semper sagittis."
//     },
//     {
//         question: "Do we have the ability to add/modify the design of the Donation Option?",
//         answer: "Maecenas interdum felis eget diam gravida imperdiet ac quis risus. Nulla convallis sem sapien, et mollis felis viverra a."
//     }
// ];

// export default function HelpPage() {
//     const [openIndex, setOpenIndex] = useState<number | null>(0);

//     return (
//         <s-page heading="Help & Support">
//             <section style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "40px" }}>
//                 <s-stack direction="block" gap="large-300">

//                     <s-stack direction="block" gap="base">
//                         <s-banner tone="info">
//                             <span slot="title" style={{ fontWeight: 600 }}>Hiding the Add to Cart Button for Donation Products</span>
//                             <s-box paddingBlockStart="base">
//                                 <s-text>
//                                     You can hide the Add to Cart button for donation products by adding a small snippet to your product template. (Lorem ipsum dolor sit amet, consectetur adipiscing elit)
//                                 </s-text>
//                                 <s-box padding="large-100" background="subdued" borderRadius="base" borderWidth="base" paddingBlockStart="large-100">
//                                     <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#202223", fontSize: "13px", fontFamily: "monospace", lineHeight: "1.5" }}>
//                                         {`{% if product.vendor == 'zestard-easy-donation' %}
// <style>
//   form[action^="/cart/add"] {
//     display: none !important;
//   }
// </style>
// {% endif %}`}
//                                     </pre>
//                                 </s-box>
//                             </s-box>
//                         </s-banner>

//                         <s-banner tone="success">
//                             <span slot="title" style={{ fontWeight: 600 }}>Get In Touch With Us</span>
//                             <s-box paddingBlockStart="base">
//                                 <s-text>
//                                     Below is the list of our Frequently Asked Questions that will help customers to understand the application features and its configuration. If your question is not listed here OR to customise anything within the app, please contact us:
//                                 </s-text>
//                                 <ul style={{ margin: "12px 0 0", paddingLeft: "20px", color: "#202223", fontSize: "14px", lineHeight: "1.8" }}>
//                                     <li>Developed By: <s-text type="strong">Dummy Technologies Pvt Ltd</s-text></li>
//                                     <li>Email: <a href="mailto:support@dummy.com" style={{ color: "#005bd3", textDecoration: "none" }}>support@dummy.com</a></li>
//                                     <li>Website: <a href="https://dummy.com" style={{ color: "#005bd3", textDecoration: "none" }}>https://dummy.com</a></li>
//                                 </ul>
//                             </s-box>
//                         </s-banner>
//                     </s-stack>

//                     <s-box paddingBlockStart="large-200">
//                         <s-text type="strong">
//                             <span style={{ fontSize: "18px" }}>Frequently Asked Questions</span>
//                         </s-text>
//                     </s-box>

//                     <s-stack direction="block" gap="base">
//                         {faqs.map((faq, index) => (
//                             <s-box
//                                 key={index}
//                                 padding="none"
//                                 borderRadius="large-100"
//                                 borderWidth="base"
//                             >
//                                 <section style={{ backgroundColor: "#ffffff", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
//                                     <button
//                                         onClick={() => setOpenIndex(openIndex === index ? null : index)}
//                                         style={{
//                                             width: "100%",
//                                             display: "flex",
//                                             justifyContent: "space-between",
//                                             alignItems: "center",
//                                             padding: "16px 20px",
//                                             background: "rgba(255, 255, 255, 1)",
//                                             border: "none",
//                                             cursor: "pointer",
//                                             textAlign: "left",
//                                             color: "#202223"
//                                         }}
//                                     >
//                                         <span style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "15px", fontWeight: "600" }}>
//                                             <span style={{ color: "#005bd3" }}>✦</span>
//                                             {faq.question}
//                                         </span>
//                                         <span style={{ transform: openIndex === index ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
//                                             <svg viewBox="0 0 20 20" style={{ width: "20px", height: "20px", fill: "#5c5f62" }}>
//                                                 <path fillRule="evenodd" d="M13.098 8H6.902c-.751 0-1.172.854-.708 1.446l3.098 3.949c.353.45 1.063.45 1.416 0l3.098-3.949c.464-.592.043-1.446-.708-1.446Z" />
//                                             </svg>
//                                         </span>
//                                     </button>
//                                     {openIndex === index && (
//                                         <s-box padding="large-100" paddingBlockStart="none">
//                                             <s-box paddingInlineStart="large-200">
//                                                 {index === 0 ? (
//                                                     <s-stack direction="block" gap="base">
//                                                         <s-stack direction="block" gap="base">
//                                                             <s-text>In total our application have two below mentioned versions :</s-text>
//                                                             <ul style={{ paddingLeft: "16px", margin: 0, lineHeight: 1.5, fontSize: "14px", color: "#6d7175" }}>
//                                                                 <li><s-text>Basic Version: Merchant will be allowed to make Single Donation and similarly can associate with single organization.</s-text></li>
//                                                                 <li style={{ marginTop: "4px" }}><s-text>Advance Version: Merchant will be allowed to make Multiple Donations(Recommended not to exceed more then 8 for better performance) and with multiple organizations.</s-text></li>
//                                                             </ul>
//                                                         </s-stack>
//                                                         <s-banner tone="warning">
//                                                             <span slot="title" style={{ fontWeight: 600 }}>Important Note</span>
//                                                             <p style={{ margin: 0, fontSize: "13px" }}>
//                                                                 Please make sure not to delete the donation products which gets generated on the installation of the application otherwise it will result in showing the errors. Donation products are always available for the add/update facility which you can do from the app's admin section and also from the "Products" section of the shopify.
//                                                             </p>
//                                                         </s-banner>
//                                                     </s-stack>
//                                                 ) : (
//                                                     <span style={{ fontSize: "14px", color: "#6d7175", lineHeight: 1.6 }}>{faq.answer}</span>
//                                                 )}
//                                             </s-box>
//                                         </s-box>
//                                     )}
//                                 </section>
//                             </s-box>
//                         ))}
//                     </s-stack>
//                 </s-stack>
//             </section>
//         </s-page>
//     );
// }

// export const headers: HeadersFunction = (headersArgs) => {
//     return boundary.headers(headersArgs);
// };



import { useState } from "react";
import type { LoaderFunctionArgs, HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    await authenticate.admin(request);
    return null;
};

const faqs = [
    {
        question: "How many donations can a merchant create?",
        answer: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pharetra hendrerit ut duis sem. Suspendisse potenti."
    },
    {
        question: "Is it required to register the organization at your end? How many Organization does it support?",
        answer: "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Phasellus tincidunt elit purus, sed bibendum enim tristique eget."
    },
    {
        question: "Is it required to have organizations/firms/charity institutions from specific countries?",
        answer: "Curabitur eget lectus at lorem accumsan faucibus. In elementum lacus eget tortor pretium imperdiet. Praesent fermentum accumsan aliquet."
    },
    {
        question: "Can we update the labels and descriptions of the donation option?",
        answer: "Nullam sollicitudin interdum dolor, at bibendum justo sollicitudin tristique. Maecenas sed lectus in dui vehicula placerat ut feugiat neque."
    },
    {
        question: "Can we have the Pre-determined donation amount as options given to the customer?",
        answer: "Aenean ullamcorper efficitur leo nec faucibus. Vestibulum suscipit velit tellus, feugiat tincidunt erat auctor ut."
    },
    {
        question: "Do we have the ability to set a minimum donation amount?",
        answer: "Nunc at dolor ac nisi dictum commodo sed id risus. Morbi gravida nunc varius ex semper sagittis."
    },
    {
        question: "Do we have the ability to add/modify the design of the Donation Option?",
        answer: "Maecenas interdum felis eget diam gravida imperdiet ac quis risus. Nulla convallis sem sapien, et mollis felis viverra a."
    }
];

export default function HelpPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

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
                                    Below is the list of our Frequently Asked Questions that will help customers to understand the application features and its configuration. If your question is not listed here OR to customise anything within the app, please contact us:
                                </s-text>
                                <ul style={{ margin: "12px 0 0", paddingLeft: "20px", color: "#202223", fontSize: "14px", lineHeight: "1.8" }}>
                                    <li><strong>Developed By:</strong> abc Pvt Ltd</li>
                                    <li><strong>Email:</strong> <a href="mailto:abc@gmail.com" style={{ color: "#005bd3", textDecoration: "none" }}>abc@gmail.com</a></li>
                                    <li><strong>Website:</strong> <a href="https://abc.com" style={{ color: "#005bd3", textDecoration: "none" }}>https://abc.com</a></li>
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
                                                            {index === 0 ? (
                                                                <s-stack direction="block" gap="base">
                                                                    <s-stack direction="block" gap="base">
                                                                        <s-text>In total our application have two below mentioned versions :</s-text>
                                                                        <ul style={{ paddingLeft: "16px", margin: 0, lineHeight: 1.5, fontSize: "14px", color: "#6d7175" }}>
                                                                            <li><s-text>Basic Version: Merchant will be allowed to make Single Donation and similarly can associate with single organization.</s-text></li>
                                                                            <li style={{ marginTop: "4px" }}><s-text>Advance Version: Merchant will be allowed to make Multiple Donations(Recommended not to exceed more then 8 for better performance) and with multiple organizations.</s-text></li>
                                                                        </ul>
                                                                    </s-stack>
                                                                    <s-banner tone="warning">
                                                                        <span slot="title" style={{ fontWeight: 600 }}>Important Note</span>
                                                                        <p style={{ margin: 0, fontSize: "13px" }}>
                                                                            Please make sure not to delete the donation products which gets generated on the installation of the application otherwise it will result in showing the errors. Donation products are always available for the add/update facility which you can do from the app's admin section and also from the "Products" section of the shopify.
                                                                        </p>
                                                                    </s-banner>
                                                                </s-stack>
                                                            ) : (
                                                                <span style={{ fontSize: "14px", color: "#6d7175", lineHeight: 1.6, display: "block", paddingBottom: "16px" }}>{faq.answer}</span>
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
