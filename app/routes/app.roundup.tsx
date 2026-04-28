import { useState, useCallback, useRef, useEffect } from "react";
import { Tabs, BlockStack, InlineStack, Box, Text, Button, Card, Link } from "@shopify/polaris";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { useLocation } from "react-router";
import ConfigurationTab, { CART_PREVIEW_SVG } from "../components/ConfigurationTab";
export async function loader({ request }: LoaderFunctionArgs) {
    const { session } = await authenticate.admin(request);
    let settings = await prisma.roundUpDonationSettings.findUnique({
        where: { shop: session.shop },
    });

    if (!settings) {
        settings = {
            shop: session.shop,
            enabled: false,
            showImage: false,
            productId: null,
            campaignTitle: "",
            description: "",
            checkboxLabel: "",
            rounding: "nearest1",
            customAmount: "",
            additionalDonationEnabled: false,
            additionalDonationTitle: "",
            placeholderText: "",
            buttonText: "",
            imageUrl: "",
            donationOrderTag: "",
            productHandle: "",
        };
    } else if (settings.productId && settings.showImage) {
        // Robust update: Always fetch the latest permanent CDN URL from Shopify 
        // to avoid issues with expired temporary URLs in the database.
        try {
            const { admin } = await authenticate.admin(request);
            const productResponse = await admin.graphql(`
                query roundupGetLiveImage($id: ID!) {
                    product(id: $id) {
                        images(first: 1) {
                            nodes {
                                url
                            }
                        }
                    }
                }
            `, { variables: { id: settings.productId } });
            const productData = await productResponse.json();
            const liveUrl = productData.data?.product?.images?.nodes?.[0]?.url;
            if (liveUrl && liveUrl !== settings.imageUrl) {
                settings.imageUrl = liveUrl;
            }
        } catch (error) {
            console.warn("Error fetching live image from Shopify", error);
        }
    }

    return { settings };
}

export async function action({ request }: ActionFunctionArgs) {
    const { session, admin } = await authenticate.admin(request);
    const formData = await request.formData();

    const settings = await prisma.roundUpDonationSettings.findUnique({
        where: { shop: session.shop },
    });

    const enabled = formData.get("enabled") === "true";
    const campaignTitle = String(formData.get("campaignTitle") || "");
    const description = String(formData.get("description") || "");
    const showImage = formData.get("showImage") === "true";
    const checkboxLabel = String(formData.get("checkboxLabel") || "");
    const rounding = String(formData.get("rounding") || "nearest1");
    const customAmount = String(formData.get("customAmount") || "");
    const donationOrderTag = String(formData.get("donationOrderTag") || "");

    const additionalDonationEnabled = formData.get("additionalDonationEnabled") === "true";
    const additionalDonationTitle = String(formData.get("additionalDonationTitle") || "");
    const placeholderText = String(formData.get("placeholderText") || "");
    const buttonText = String(formData.get("buttonText") || "");
    const imageUrl = String(formData.get("imageUrl") || "https://cdn-icons-png.flaticon.com/512/3772/3772231.png");
    const isNewImage = imageUrl.startsWith("data:image");


    const shopQuery = await admin.graphql(`
    #graphql
    query RoundupGetShop {
      shop { id }
    }
  `);
    const shopData = await shopQuery.json();
    const shopId = shopData.data.shop.id;
    let onlineStorePublicationId: string | null = null;

    try {
        const publicationQuery = await admin.graphql(`
      query {
        publications(first: 10) {
          nodes {
            id
            name
          }
        }
      }
    `);

        const publicationData = await publicationQuery.json();
        const publications = publicationData.data?.publications?.nodes || [];

        console.log("All publications:", publications);

        //  SAFE WAY (always pick Online Store correctly)href={`https://admin.shopify.com/store/gwl-apps-demo/products/${settings.productId.split('/').pop()}`}href={`https://admin.shopify.com/store/gwl-apps-demo/products/${settings.productId.split('/').pop()}`}
        const onlineStore = publications.find((p: any) =>
            p.name.toLowerCase().includes("online")
        );

        onlineStorePublicationId = onlineStore?.id || null;

        console.log("Selected publication:", onlineStorePublicationId);

    } catch (error) {
        console.warn("Publication fetch error", error);
    }


    // let onlineStorePublicationId: string | null = null;

    // try {
    //     const publicationQuery = await admin.graphql(`
    //   #graphql
    //   query RoundupGetPublications {
    //     publications(first: 5) {
    //       nodes {
    //         id
    //         name
    //       }
    //     }
    //   }
    // `);
    //     const publicationData = await publicationQuery.json();
    //     const publications = publicationData.data?.publications?.nodes || [];
    //     onlineStorePublicationId =
    //         publications.find((p: any) => p.name === "Online Store")?.id ||
    //         publications[0]?.id ||
    //         null;
    // } catch (error) {
    //     // App may not have read_publications scope; continue without publish step.
    //     console.warn("RoundUpDonation: publications scope missing, skipping auto-publish", error);
    // }

    // ================= 🔹 PRODUCT LOGIC 🔹 =================
    // let productId: string | null = null;
    let productId: string | null = null;
    let productHandle = "";

    // Always reuse a single donation campaign product (identified by tag).
    let finalImageUrl = imageUrl;
    if (!productId || isNewImage) { // Unconditionally update product on every save
        const existingProductResponse = await admin.graphql(`
      #graphql
      query RoundupFindExistingDonationProduct {
        products(first: 1, query: "tag:roundup-donation-product") {
          nodes {
            id
            handle
          }
        }
      }
    `);
        const existingProductData = await existingProductResponse.json();
        const existingProduct = existingProductData.data?.products?.nodes?.[0];
        if (existingProduct) {
            productId = existingProduct.id;
            productHandle = existingProduct.handle;
        }

        const productMutation = `
      mutation CreateOrUpdateProduct($input: ProductSetInput!) {
        productSet(input: $input) {
          product {
            id
            handle
            images(first: 1) {
              nodes {
                url
              }
            }
            variants(first: 10) {
              nodes {
                id
                price
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

        // if (showImage && imageUrl.startsWith("data:image")) {
        // if (imageUrl && imageUrl.startsWith("data:image")) {
        if (isNewImage) {
            try {
                const base64Parts = imageUrl.split(",");
                const contentType = base64Parts[0].split(":")[1].split(";")[0];
                const extension = contentType.split("/")[1] || "png";
                const filename = `donation-image-${Date.now()}.${extension}`;
                const base64Data = base64Parts[1];
                const buffer = Buffer.from(base64Data, "base64");

                const stagedMutation = `
          mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
            stagedUploadsCreate(input: $input) {
              stagedTargets {
                url
                resourceUrl
                parameters {
                  name
                  value
                }
              }
            }
          }
        `;

                const stagedResponse = await admin.graphql(stagedMutation, {
                    variables: {
                        input: [
                            {
                                filename,
                                mimeType: contentType,
                                resource: "IMAGE",
                                fileSize: buffer.length.toString(),
                                httpMethod: "POST",
                            },
                        ],
                    },
                });

                const stagedData = await stagedResponse.json();
                const target = stagedData.data.stagedUploadsCreate.stagedTargets[0];

                // Prepare upload form data
                const formDataUpload = new FormData();
                target.parameters.forEach(({ name, value }: any) => {
                    formDataUpload.append(name, value);
                });

                // Convert Buffer to Blob for fetch
                const blob = new Blob([buffer], { type: contentType });
                formDataUpload.append("file", blob, filename);

                const uploadResponse = await fetch(target.url, {
                    method: "POST",
                    body: formDataUpload,
                });

                if (uploadResponse.ok) {
                    finalImageUrl = target.resourceUrl;
                } else {
                    console.error("Shopify upload failed", await uploadResponse.text());
                }
            } catch (error) {
                console.error("Error during image upload workflow", error);
            }
        }

        const productInput: any = {
            title: campaignTitle || "Round Up Donation",
            descriptionHtml: `<p>${description}</p>`,
            vendor: "Rounded-donation",
            productType: "Donation",
            status: enabled ? "ACTIVE" : "DRAFT",
            tags: ["roundup-donation-product"],
        };
        // if (showImage && finalImageUrl) {
        if (showImage && finalImageUrl && (!productId || isNewImage)) {
            productInput.files = [
                {
                    alt: "Donation Image",
                    contentType: "IMAGE",
                    originalSource: finalImageUrl,
                },
            ];
        }
        // if (showImage && finalImageUrl && !finalImageUrl.startsWith("data:image")) {
        //     productInput.files = [
        //         {
        //             alt: "Donation Image",
        //             contentType: "IMAGE",
        //             originalSource: finalImageUrl
        //         }
        //     ];
        // } if (showImage && finalImageUrl) {
        //     productInput.files = [
        //         {
        //             alt: "Donation Image",
        //             contentType: "IMAGE",
        //             originalSource: finalImageUrl,
        //         },
        //     ];
        // }

        if (productId) {
            productInput.id = productId;

            // ── Force existing variants to be non-shippable ────────────────────
            try {
                const variantQuery = await admin.graphql(`
                  query getRoundupVariants($id: ID!) {
                    product(id: $id) {
                      variants(first: 50) {
                        nodes {
                          id
                        }
                      }
                    }
                  }
                `, { variables: { id: productId } });

                const variantData: any = await variantQuery.json();
                const variantNodes = variantData.data?.product?.variants?.nodes || [];

                if (variantNodes.length > 0) {
                    const bulkUpdateVariants = variantNodes.map((v: any) => ({
                        id: v.id,
                        inventoryItem: { requiresShipping: false }
                    }));

                    const bulkUpdateRes = await admin.graphql(`
                      mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
                        productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                          userErrors { field message }
                        }
                      }
                    `, { variables: { productId, variants: bulkUpdateVariants } });

                    const bulkUpdateJson: any = await bulkUpdateRes.json();
                    const bulkErrors = bulkUpdateJson.data?.productVariantsBulkUpdate?.userErrors || [];
                    if (bulkErrors.length > 0) {
                        console.warn("[RoundUp] Bulk variant update errors:", bulkErrors);
                    } else {
                        console.log(`[RoundUp] Successfully updated ${variantNodes.length} variants to non-shippable.`);
                    }
                }
            } catch (variantErr) {
                console.error("[RoundUp] Failed to update variants:", variantErr);
            }
        } else {
            productInput.productOptions = [
                {
                    name: "Amount",
                    values: [
                        { name: "0.01" },
                        { name: "0.10" },
                        { name: "1.00" },
                        { name: "10.00" },
                        { name: "100.00" },
                        { name: "1000.00" }
                    ]
                }
            ];
            productInput.variants = [
                { price: "0.01", optionValues: [{ optionName: "Amount", name: "0.01" }], inventoryPolicy: "CONTINUE", inventoryItem: { tracked: false, requiresShipping: false } },
                { price: "0.10", optionValues: [{ optionName: "Amount", name: "0.10" }], inventoryPolicy: "CONTINUE", inventoryItem: { tracked: false, requiresShipping: false } },
                { price: "1.00", optionValues: [{ optionName: "Amount", name: "1.00" }], inventoryPolicy: "CONTINUE", inventoryItem: { tracked: false, requiresShipping: false } },
                { price: "10.00", optionValues: [{ optionName: "Amount", name: "10.00" }], inventoryPolicy: "CONTINUE", inventoryItem: { tracked: false, requiresShipping: false } },
                { price: "100.00", optionValues: [{ optionName: "Amount", name: "100.00" }], inventoryPolicy: "CONTINUE", inventoryItem: { tracked: false, requiresShipping: false } },
                { price: "1000.00", optionValues: [{ optionName: "Amount", name: "1000.00" }], inventoryPolicy: "CONTINUE", inventoryItem: { tracked: false, requiresShipping: false } }
            ];
            // productInput.variants = [
            //   { price: "0.01", optionValues: [{ optionName: "Amount", name: "0.01" }], inventoryPolicy: "CONTINUE" },
            //   { price: "0.10", optionValues: [{ optionName: "Amount", name: "0.10" }], inventoryPolicy: "CONTINUE" },
            //   { price: "1.00", optionValues: [{ optionName: "Amount", name: "1.00" }], inventoryPolicy: "CONTINUE" },
            //   { price: "10.00", optionValues: [{ optionName: "Amount", name: "10.00" }], inventoryPolicy: "CONTINUE" },
            //   { price: "100.00", optionValues: [{ optionName: "Amount", name: "100.00" }], inventoryPolicy: "CONTINUE" },
            //   { price: "1000.00", optionValues: [{ optionName: "Amount", name: "1000.00" }], inventoryPolicy: "CONTINUE" }
            // ];
        }

        const pResponse = await admin.graphql(productMutation, {
            variables: { input: productInput }
        });
        const pData = await pResponse.json();

        // if (pData.data?.productSet?.product) {
        //     productId = pData.data.productSet.product.id;
        //     productHandle = pData.data.productSet.product.handle;

        //     // Ensure the donation product is published to the Online Store
        //     if (onlineStorePublicationId && !productInput.id) {
        //         try {
        //             const publishMutation = `
        //     mutation PublishDonationProduct($publishableId: ID!, $publicationId: ID!) {
        //       publishablePublish(publishableId: $publishableId, publicationId: $publicationId) {
        //         userErrors {
        //           field
        //           message
        //         }
        //       }
        //     }
        //   `;

        //             const pubResponse = await admin.graphql(publishMutation, {
        //                 variables: {
        //                     publishableId: productId,
        //                     publicationId: onlineStorePublicationId,
        //                 },
        //             });

        //             const pubData = await pubResponse.json();
        //             const pubErrors = pubData.data?.publishablePublish?.userErrors;
        //             if (pubErrors && pubErrors.length > 0) {
        //                 console.error("RoundUpDonation: publish errors", pubErrors);
        //             }
        //         } catch (error) {
        //             console.warn("RoundUpDonation: auto-publish failed", error);
        //         }
        //     }
        // } else if (pData.data?.productSet?.userErrors?.length) {
        //     console.error("RoundUpDonation: productSet errors", pData.data.productSet.userErrors);
        // }

        if (pData.data?.productSet?.product) {
            productId = pData.data.productSet.product.id;
            productHandle = pData.data.productSet.product.handle;

            // If a new image was uploaded, try to get the permanent CDN URL
            if (isNewImage) {
                let fetchedUrl = pData.data.productSet.product.images?.nodes?.[0]?.url;

                // If it's not immediately available, try one more time after a short delay
                if (!fetchedUrl) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const productQuery = await admin.graphql(`
                        query roundupGetProductImage($id: ID!) {
                            product(id: $id) {
                                images(first: 1) {
                                    nodes {
                                        url
                                    }
                                }
                            }
                        }
                    `, { variables: { id: productId } });
                    const productData = await productQuery.json();
                    fetchedUrl = productData.data?.product?.images?.nodes?.[0]?.url;
                }

                if (fetchedUrl) {
                    finalImageUrl = fetchedUrl;
                }
            }

            //  ALWAYS publish (new + existing dono ke liye)
            if (onlineStorePublicationId) {
                try {
                    const publishMutation = `
        mutation PublishDonationProduct($id: ID!, $input: [PublicationInput!]!) {
          publishablePublish(id: $id, input: $input) {
            userErrors {
              field
              message
            }
          }
        }
      `;

                    const pubResponse = await admin.graphql(publishMutation, {
                        variables: {
                            id: productId,
                            input: [{ publicationId: onlineStorePublicationId }],
                        },
                    });

                    const pubData = await pubResponse.json();
                    const pubErrors = pubData.data?.publishablePublish?.userErrors;

                    if (pubErrors && pubErrors.length > 0) {
                        console.error("RoundUpDonation: publish errors", pubErrors);
                    } else {
                        console.log(" Product published to Online Store");
                    }

                } catch (error) {
                    console.warn("RoundUpDonation: auto-publish failed", error);
                }
            }

        } else if (pData.data?.productSet?.userErrors?.length) {
            console.error("RoundUpDonation: productSet errors", pData.data.productSet.userErrors);
        }
    }


    // ================= 🔹 DATABASE UPDATE 🔹 =================
    const updateData = {
        enabled,
        campaignTitle,
        description,
        showImage,
        checkboxLabel,
        rounding,
        customAmount,
        donationOrderTag,
        additionalDonationEnabled,
        additionalDonationTitle,
        placeholderText,
        buttonText,
        imageUrl: finalImageUrl,
        productId,
        productHandle,
    };

    await prisma.roundUpDonationSettings.upsert({
        where: { shop: session.shop },
        update: updateData,
        create: {
            shop: session.shop,
            ...updateData,
        },
    });

    const valueData = {
        enabled,
        campaignTitle,
        description,
        showImage,
        checkboxLabel,
        rounding,
        customAmount,
        productId,
        productHandle,
        additionalDonationEnabled,
        additionalDonationTitle,
        placeholderText,
        buttonText,
        imageUrl: finalImageUrl,
    };


    const response = await admin.graphql(`
    #graphql
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          key
          namespace
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `, {
        variables: {
            metafields: [
                {
                    key: "settings",
                    namespace: "roundup_donation",
                    ownerId: shopId,
                    type: "json",
                    value: JSON.stringify(valueData)
                }
            ]
        }
    });

    const responseJson = await response.json();
    const userErrors = responseJson.data?.metafieldsSet?.userErrors;

    if (userErrors && userErrors.length > 0) {
        console.error("Metafield update errors:", userErrors);
        return { success: false, errors: userErrors };
    }

    return { success: true };
}

export default function RoundUpDonationPage() {

    const { settings } = useLoaderData<typeof loader>();

    //  TABS STATE
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);
    const handleTabChange = useCallback(
        (itemIndex: number) => setSelectedTabIndex(itemIndex),
        [],
    );

    //  SETTINGS STATE
    const [enabled, setEnabled] = useState(settings?.enabled ?? false);
    const [showImage, setShowImage] = useState(settings?.showImage ?? false);
    const [additionalDonationEnabled, setAdditionalDonationEnabled] = useState(settings?.additionalDonationEnabled ?? false);
    const [campaignTitlePreview, setCampaignTitlePreview] = useState(settings?.campaignTitle || "Support Our Cause");
    const [descriptionPreview, setDescriptionPreview] = useState(
        settings?.description || "Round up your order and donate {amount} to support our cause. Every small contribution makes a difference.",
    );

    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (selectedTabIndex === 0 && editorRef.current && editorRef.current.innerHTML !== descriptionPreview) {
            editorRef.current.innerHTML = descriptionPreview;
        }
    }, [selectedTabIndex]);

    const handleEditorInput = () => {
        if (editorRef.current) {
            setDescriptionPreview(editorRef.current.innerHTML);
        }
    };

    const execCommand = (command: string, value: string | undefined = undefined) => {
        document.execCommand(command, false, value);
        handleEditorInput();
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    const [checkboxLabelPreview, setCheckboxLabelPreview] = useState(
        settings?.checkboxLabel || "Yes, I want to donate {amount}",
    );
    const [roundingMode, setRoundingMode] = useState(settings?.rounding || "nearest1");
    const [customAmount, setCustomAmount] = useState("0.61");
    const [additionalDonationTitlePreview, setAdditionalDonationTitlePreview] = useState(
        settings?.additionalDonationTitle || "Add an extra donation (optional)",
    );
    const [placeholderTextPreview, setPlaceholderTextPreview] = useState(
        settings?.placeholderText || "Enter amount",
    );
    const [buttonTextPreview, setButtonTextPreview] = useState(settings?.buttonText || "Donate");
    const [imageUrlPreview, setImageUrlPreview] = useState(settings?.imageUrl || "https://cdn-icons-png.flaticon.com/512/3772/3772231.png");
    const [donationOrderTag, setDonationOrderTag] = useState(settings?.donationOrderTag || "");

    const choiceListRef = useRef<any>(null);
    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get("tab");

        if (tab === "integration") {
            setSelectedTabIndex(1);
        }
    }, [location.search]);
    useEffect(() => {
        const el = choiceListRef.current;
        if (!el) return;
        const handleChange = (e: any) => {
            // Robust value detection for web components
            const val = e.detail?.selected?.[0] || e.detail?.value || e.target?.value || e.target?.values?.[0];
            if (val) {
                setRoundingMode(String(val));
            }
        };
        el.addEventListener("change", handleChange);
        el.addEventListener("input", handleChange); // Added input listener for some browser versions
        return () => {
            el.removeEventListener("change", handleChange);
            el.removeEventListener("input", handleChange);
        };
    }, []);


    // 🔹 IMPROVED CALCULATION LOGIC (from user snippet)
    const cartTotal = 99.39;
    let displayPrice = "$0.00";
    if (roundingMode === "custom") {
        displayPrice = customAmount ? `$${Number(customAmount).toFixed(2)}` : "$0.00";
    } else {
        let rounded = Math.ceil(cartTotal);
        if (roundingMode === "nearest5") rounded = Math.ceil(cartTotal / 5) * 5;
        if (roundingMode === "nearest10") rounded = Math.ceil(cartTotal / 10) * 10;
        displayPrice = `$${(rounded - cartTotal).toFixed(2)}`;
    }

    const replaceAmount = (text: string, amount: string) => {
        if (!text) return "";
        return text
            .replace(/{amount}/g, amount)
            .replace(/\(amount\)/g, amount)
            .replace(/\[amount\]/g, amount);
    };

    const previewDescriptionText = replaceAmount(descriptionPreview, displayPrice);
    const previewCheckboxText = replaceAmount(checkboxLabelPreview, displayPrice);

    const handleToggle = (e: any) => {
        e.preventDefault();
        document.getElementById('enabled-checkbox')?.click();
    };

    const handleImageToggle = (e: any) => {
        const newVal = e.target.checked;
        const checkbox = document.getElementById('showImage-checkbox') as HTMLInputElement;
        if (checkbox && checkbox.checked !== newVal) {
            checkbox.click();
        } else {
            setShowImage(newVal);
        }
    };

    const handleAdditionalToggle = (e: any) => {
        e.preventDefault();
        document.getElementById('additional-checkbox')?.click();
    };

    const tabs = [

        { id: 'settings', content: 'Settings', panelID: 'settings-content' },
        { id: 'Configuration', content: 'Configuration', panelID: 'Configuration-content' },
    ];

    return (
        <s-page inline-size="large">
            <div className="polaris-tabs">
                <div className="polaris-tabs-list" role="tablist">
                    {tabs.map((tab, index) => {
                        const isSelected = selectedTabIndex === index;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isSelected}
                                className={`polaris-tab ${isSelected ? "active" : ""}`}
                                onClick={() => handleTabChange(index)}
                            >
                                {tab.content}
                            </button>
                        );
                    })}
                </div>
            </div>

            <style>{`
                .polaris-tabs {
                  border-bottom: 1px solid #dfe3e8;
                  margin-bottom: 20px;
                }
                .polaris-tabs-list {
                  display: flex;
                  gap: 0;
                  overflow-x: auto;
                }
                .polaris-tab {
                  padding: 12px 16px;
                  background: none;
                  border: none;
                  border-bottom: 3px solid transparent;
                  color: #000000;
                  font-size: 14px;
                  font-weight: 500;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  white-space: nowrap;
                }
                .polaris-tab:hover {
                  color: #6C4A79;
                }
                .polaris-tab.active {
                  color: #6C4A79;
                  border-bottom-color: #6C4A79;
                }
            `}</style>




            {/* ================= TAB 1: SETTINGS ================= */}
            {selectedTabIndex === 0 && (
                <>
                    {/* Premium Warning Banner */}
                    <div style={{ marginBottom: '24px' }}>
                        <s-banner heading="Secure Configuration" tone="info">
                            <s-text color="subdued">
                                We've synced a dedicated donation product with your store. To maintain seamless operation, please manage all changes through this dashboard rather than the Shopify Admin.
                            </s-text>
                            {settings?.productId ? (
                                <s-button
                                    slot="secondary-actions"
                                    variant="secondary"
                                    href={`https://admin.shopify.com/store/${settings?.shop?.split(".")[0]}/products/${settings.productId?.split("/")?.pop()}`}
                                >
                                    View Shopify Product
                                </s-button>
                            ) : (
                                <s-text tone="neutral">
                                    Initial setup required. Click "Save" to generate your donation product.
                                </s-text>
                            )}
                        </s-banner>
                    </div>

                    {/*  SAVE BAR ENABLE */}
                    <Form method="post" data-save-bar>
                        {/*  HIDDEN INPUTS (CRITICAL FOR FUNCTIONALITY) */}
                        <input type="checkbox" name="enabled" id="enabled-checkbox" value="true" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} style={{ display: 'none' }} />
                        <input type="checkbox" name="showImage" id="showImage-checkbox" value="true" checked={showImage} onChange={(e) => setShowImage(e.target.checked)} style={{ display: 'none' }} />
                        <input type="checkbox" name="additionalDonationEnabled" id="additional-checkbox" value="true" checked={additionalDonationEnabled} onChange={(e) => setAdditionalDonationEnabled(e.target.checked)} style={{ display: 'none' }} />

                        <input type="hidden" name="campaignTitle" value={campaignTitlePreview} />
                        <input type="hidden" name="description" value={descriptionPreview} />
                        <input type="hidden" name="checkboxLabel" value={checkboxLabelPreview} />
                        <input type="hidden" name="rounding" value={roundingMode} />
                        <input type="hidden" name="customAmount" value={customAmount} />
                        <input type="hidden" name="additionalDonationTitle" value={additionalDonationTitlePreview} />
                        <input type="hidden" name="placeholderText" value={placeholderTextPreview} />
                        <input type="hidden" name="buttonText" value={buttonTextPreview} />
                        <input type="hidden" name="imageUrl" value={imageUrlPreview} />

                        <div style={{ marginBottom: '24px' }}>
                            <BlockStack gap="100">
                                <Text variant="headingLg" as="h2">Campaign Customization</Text>
                                <Text variant="bodyMd" tone="subdued">Configure your roundup experience to match your brand's voice and mission.</Text>
                            </BlockStack>
                        </div>

                        {/* ================= MAIN CONTENT ================= */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '32px', alignItems: 'start' }}>
                            <s-stack gap="large">

                                {/* Widget Status Card */}
                                <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base" shadow="base">
                                    <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                                        <s-stack gap="small">
                                            <s-stack direction="inline" gap="small" alignItems="center">
                                                <s-text type="strong"><span style={{ fontSize: "16px", letterSpacing: '-0.01em' }}>Round-Up Widget Status</span></s-text>
                                                {enabled ? (
                                                    <s-badge tone="success">Live</s-badge>
                                                ) : (
                                                    <s-badge tone="warning">Inactive</s-badge>
                                                )}
                                            </s-stack>
                                            <s-text color="subdued">
                                                <span style={{ fontSize: '13px' }}>{enabled ? "The widget is currently active and visible to your customers at checkout." : "Activate the widget to start collecting round-up donations."}</span>
                                            </s-text>
                                        </s-stack>
                                        <s-button type="button" variant={enabled ? "secondary" : "primary"} onClick={handleToggle}>
                                            {enabled ? "Deactivate Widget" : "Activate Widget"}
                                        </s-button>
                                    </s-stack>
                                </s-box>

                                {/* Contribution Content Settings Card */}
                                <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base" shadow="base">
                                    <s-stack gap="large">
                                        <s-stack gap="small">
                                            <s-text type="strong"><span style={{ fontSize: "16px", letterSpacing: '-0.01em' }}>Visual Content Settings</span></s-text>
                                            <s-text color="subdued">Customize how your donation request appears to customers in the cart.</s-text>
                                        </s-stack>

                                        <div style={{ height: "1px", background: "#f1f2f3", width: "100%" }} />

                                        <s-stack gap="base">
                                            <s-text-field
                                                name="campaignTitle"
                                                label="Contribution Title"
                                                value={campaignTitlePreview}
                                                onInput={(e: any) => setCampaignTitlePreview(e.target.value)}
                                                labelAccessibilityVisibility="visible"
                                            />

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: '#202223', marginBottom: '2px' }}>Contribution Description</div>
                                                <div style={{ border: '1px solid #dfe3e8', borderRadius: '8px', overflow: 'hidden', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                    <div style={{ borderBottom: '1px solid #dfe3e8', padding: '8px 12px', display: 'flex', gap: '8px', background: '#f9fafb', alignItems: 'center', flexWrap: 'wrap' }}>

                                                        {/* Paragraph / Heading Selector */}
                                                        <select
                                                            onChange={(e) => execCommand('formatBlock', e.target.value)}
                                                            defaultValue="p"
                                                            style={{ padding: '6px 10px', border: '1px solid #dfe3e8', borderRadius: '6px', fontSize: '13px', color: '#202223', background: '#fff', cursor: 'pointer', outline: 'none' }}
                                                        >
                                                            <option value="p">Body Text</option>
                                                            <option value="h3">Subheading</option>
                                                            <option value="h2">Heading</option>
                                                        </select>

                                                        <div style={{ width: '1px', height: '20px', background: '#dfe3e8', margin: '0 4px' }} />

                                                        {/* Formatting Buttons */}
                                                        <button type="button" onClick={() => execCommand('bold')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#454f5b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f6f8')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} title="Bold">
                                                            <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M12.44 9.08c1.37-.62 2.16-1.89 2.16-3.33 0-2.45-2-4.25-4.85-4.25H4.25v15h5.81c3.1 0 5.19-2 5.19-4.5 0-1.83-1.02-3.23-2.81-2.92zM7.25 4.5h2.5c1.34 0 2.22.84 2.22 1.94 0 1.1-.88 1.94-2.22 1.94H7.25V4.5zm0 9.5v-4h2.8c1.55 0 2.62.9 2.62 2.06s-1.07 1.94-2.62 1.94h-2.8z" /></svg>
                                                        </button>
                                                        <button type="button" onClick={() => execCommand('italic')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#454f5b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f6f8')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} title="Italic">
                                                            <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M8 2h6v2h-1.63l-2.74 9H11.5v2h-6v-2h1.63l2.74-9H8V2z" /></svg>
                                                        </button>

                                                        <div style={{ width: '1px', height: '20px', background: '#dfe3e8', margin: '0 4px' }} />

                                                        {/* List Buttons */}
                                                        <button type="button" onClick={() => execCommand('insertUnorderedList')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#454f5b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f6f8')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} title="Bullet List">
                                                            <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M6 5h12v2H6V5zm0 4h12v2H6V9zm0 4h12v2H6v-2zM3 5h2v2H3V5zm0 4h2v2H3V9zm0 4h2v2H3v-2z" /></svg>
                                                        </button>

                                                        <div style={{ width: '1px', height: '20px', background: '#dfe3e8', margin: '0 4px' }} />

                                                        {/* Action Buttons */}
                                                        <button type="button" onClick={() => execCommand('undo')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px', color: '#454f5b', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f6f8')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')} title="Undo">
                                                            <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: 'currentColor' }}><path d="M8 14.5a.5.5 0 0 1 0 1C4.13 15.5 1 12.37 1 8.5S4.13 1.5 8 1.5A6.47 6.47 0 0 1 12.6 3.4L14.5 1.5a.5.5 0 0 1 .85.35v6a.5.5 0 0 1-.5.5h-6A.5.5 0 0 1 8.5 7.5v-.5a.5.5 0 0 1 .15-.35l1.9-1.9A5.47 5.47 0 0 0 8 2.5c-3.31 0-6 2.69-6 6s2.69 6 6 6z" /></svg>
                                                        </button>
                                                    </div>
                                                    <div
                                                        ref={editorRef}
                                                        contentEditable
                                                        onInput={handleEditorInput}
                                                        onBlur={handleEditorInput}
                                                        style={{ minHeight: '120px', padding: '16px', outline: 'none', fontSize: '14px', lineHeight: '1.6', cursor: 'text', background: '#fff', color: '#202223' }}
                                                    />
                                                </div>
                                            </div>
                                        </s-stack>

                                        <div style={{ height: "1px", background: "#e1e3e5", width: "100%" }} />

                                        <s-stack gap="large">
                                            <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                                                <s-text type="strong">Display Contribution Image</s-text>
                                                <s-switch checked={showImage} onChange={handleImageToggle}></s-switch>
                                            </s-stack>

                                            <div style={{ opacity: showImage ? 1 : 0.4, transition: "opacity 0.2s ease" }}>
                                                <s-stack direction="inline" gap="large" alignItems="center">
                                                    <div style={{ border: "1px solid #e1e3e5", borderRadius: "8px", overflow: "hidden", width: "80px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                        {/* <img src={imageUrlPreview} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Donation Cause" /> */}
                                                        <img
                                                            src={imageUrlPreview || "https://via.placeholder.com/80"}
                                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                        />
                                                    </div>
                                                    <s-stack gap="small">
                                                        <s-button type="button" onClick={() => document.getElementById('image-upload-input')?.click()} disabled={!showImage}>
                                                            Upload New Image
                                                        </s-button>

                                                        <input
                                                            type="file"
                                                            id="image-upload-input"
                                                            style={{ display: 'none' }}
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                if (!showImage) return;
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = (event) => {
                                                                        if (event.target?.result) {
                                                                            setImageUrlPreview(event.target.result as string);
                                                                        }
                                                                    };
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                        />
                                                    </s-stack>
                                                </s-stack>
                                            </div>
                                        </s-stack>

                                        <div style={{ height: "1px", background: "#e1e3e5", width: "100%" }} />

                                        <s-stack gap="none">
                                            <s-text-field
                                                name="checkboxLabel"
                                                label="Checkbox Label"
                                                value={checkboxLabelPreview}
                                                onInput={(e: any) => setCheckboxLabelPreview(e.target.value)}
                                                labelAccessibilityVisibility="visible"
                                            />
                                            <s-text color="subdued">Use (amount) as a placeholder for the calculated donation amount.</s-text>
                                        </s-stack>
                                    </s-stack>
                                </s-box>

                                {/* Round-Up Preferences Card */}
                                <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base" shadow="base">
                                    <s-stack gap="large">
                                        <s-stack gap="small">
                                            <s-text type="strong"><span style={{ fontSize: "16px", letterSpacing: '-0.01em' }}>Rounding Rules</span></s-text>
                                            <s-text color="subdued">Define how the cart total should be calculated for the donation.</s-text>
                                        </s-stack>

                                        <div style={{ height: "1px", background: "#f1f2f3", width: "100%" }} />

                                        <s-stack gap="base">
                                            <s-choice-list
                                                name="rounding"
                                                ref={choiceListRef}
                                                values={[roundingMode]}
                                                onInput={(e: any) => {
                                                    const val = e.target.value || e.detail?.value || (e.target as any).values?.[0];
                                                    if (val) setRoundingMode(String(val));
                                                }}
                                            >
                                                <s-choice value="nearest1" selected={roundingMode === 'nearest1'}>Round to nearest $1.00</s-choice>
                                                <s-choice value="nearest5" selected={roundingMode === 'nearest5'}>Round to nearest $5.00</s-choice>
                                                <s-choice value="nearest10" selected={roundingMode === 'nearest10'}>Round to nearest $10.00</s-choice>
                                                <s-choice value="custom" selected={roundingMode === 'custom'}>Fixed custom amount</s-choice>
                                            </s-choice-list>

                                            {roundingMode === "custom" && (
                                                <s-box paddingBlockStart="small">
                                                    <s-text-field
                                                        name="customAmount"
                                                        label="Donation Amount ($)"
                                                        value={customAmount}
                                                        onInput={(e: any) =>
                                                            setCustomAmount(e.target.value || e.detail?.value || "")
                                                        }
                                                        labelAccessibilityVisibility="visible"
                                                    />
                                                </s-box>
                                            )}
                                        </s-stack>

                                        <div style={{ padding: '12px', background: '#f4f6f8', borderRadius: '6px', borderLeft: '3px solid #6C4A79' }}>
                                            <s-text color="subdued" size="small">
                                                Tip: Most merchants choose "Nearest $1" for the best conversion rate.
                                            </s-text>
                                        </div>

                                        <s-text-field
                                            name="donationOrderTag"
                                            label="Internal Order Tag"
                                            value={settings?.donationOrderTag || "roundUpDonation"}
                                            readOnly
                                            labelAccessibilityVisibility="visible"
                                        />
                                    </s-stack>
                                </s-box>

                                {/* Manual Contribution Card */}
                                <s-box padding="large" background="base" borderWidth="base" borderRadius="large" borderColor="base" shadow="base">
                                    <s-stack gap="large">
                                        <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                                            <s-stack gap="small">
                                                <s-stack direction="inline" gap="small" alignItems="center">
                                                    <s-text type="strong"><span style={{ fontSize: "16px", letterSpacing: '-0.01em' }}>Optional Manual Top-Up</span></s-text>
                                                    {additionalDonationEnabled ? (
                                                        <s-badge tone="success">Active</s-badge>
                                                    ) : (
                                                        <s-badge tone="warning">Disabled</s-badge>
                                                    )}
                                                </s-stack>
                                                <s-text color="subdued">Allow customers to add a specific donation amount manually.</s-text>
                                            </s-stack>
                                            <s-button type="button" variant={additionalDonationEnabled ? "secondary" : "primary"} onClick={handleAdditionalToggle}>
                                                {additionalDonationEnabled ? "Disable" : "Enable"}
                                            </s-button>
                                        </s-stack>

                                        {additionalDonationEnabled && (
                                            <>
                                                <div style={{ height: "1px", background: "#f1f2f3", width: "100%" }} />
                                                <s-stack gap="base">
                                                    <s-text-field
                                                        name="additionalDonationTitle"
                                                        label="Widget Headline"
                                                        value={additionalDonationTitlePreview}
                                                        onInput={(e: any) => setAdditionalDonationTitlePreview(e.target.value)}
                                                        labelAccessibilityVisibility="visible"
                                                    />
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                                                        <s-text-field
                                                            name="placeholderText"
                                                            label="Input Placeholder"
                                                            value={placeholderTextPreview}
                                                            onInput={(e: any) => setPlaceholderTextPreview(e.target.value)}
                                                            labelAccessibilityVisibility="visible"
                                                        />
                                                        <s-text-field
                                                            name="buttonText"
                                                            label="Action Button Text"
                                                            value={buttonTextPreview}
                                                            onInput={(e: any) => setButtonTextPreview(e.target.value)}
                                                            labelAccessibilityVisibility="visible"
                                                        />
                                                    </div>
                                                </s-stack>
                                            </>
                                        )}
                                    </s-stack>
                                </s-box>
                            </s-stack>

                            {/* LIVE PREVIEW (SIDEBAR) */}
                            <div style={{ position: "sticky", top: "24px" }}>
                                <s-stack gap="large">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <svg viewBox="0 0 20 20" style={{ width: '18px', height: '18px', fill: '#6C4A79' }}><path d="M12 2a1 1 0 0 1 1 1v1h1a1 1 0 1 1 0 2h-1v1a1 1 0 1 1-2 0V6H9a1 1 0 1 1 0-2h1V3a1 1 0 0 1 1-1ZM5 8a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8Zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H7Z" /></svg>
                                        <s-text type="strong"><span style={{ fontSize: "15px", letterSpacing: '-0.01em', color: '#6C4A79' }}>Live Widget Preview</span></s-text>
                                    </div>

                                    <s-box padding="none" background="base" borderWidth="base" borderRadius="large" borderColor="base" shadow="base" overflow="hidden">
                                        <div style={{ background: '#f9fafb', padding: '12px 16px', borderBottom: '1px solid #dfe3e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <s-text type="strong" size="small">Storefront Preview</s-text>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }}></div>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }}></div>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }}></div>
                                            </div>
                                        </div>

                                        <s-box padding="large">
                                            <s-stack gap="large">
                                                <s-stack direction="inline" gap="base" alignItems="center">
                                                    {showImage && (
                                                        <div style={{
                                                            width: '56px',
                                                            height: '56px',
                                                            overflow: 'hidden',
                                                            borderRadius: '12px',
                                                            border: '1px solid #eee',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                                        }}>
                                                            <img src={imageUrlPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        </div>
                                                    )}
                                                    <s-text type="strong"><span style={{ fontSize: '15px' }}>{campaignTitlePreview || "Support Our Cause"}</span></s-text>
                                                </s-stack>

                                                <div
                                                    dangerouslySetInnerHTML={{ __html: previewDescriptionText }}
                                                    style={{ color: '#454f5b', fontSize: '14px', lineHeight: '1.6', margin: '4px 0' }}
                                                />

                                                <div style={{
                                                    padding: '16px',
                                                    background: 'linear-gradient(135deg, #f6f6f7 0%, #ffffff 100%)',
                                                    borderRadius: '10px',
                                                    border: '1px solid #dfe3e8',
                                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <s-text color="subdued">Calculated Round-Up</s-text>
                                                        <s-text type="strong" ><span style={{ color: '#6C4A79', fontSize: '16px' }}>{displayPrice}</span></s-text>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <input type="checkbox" checked readOnly style={{ accentColor: '#6C4A79', width: '18px', height: '18px' }} />
                                                    <s-text><span style={{ fontSize: '14px', fontWeight: 500 }}>{previewCheckboxText}</span></s-text>
                                                </div>

                                                {additionalDonationEnabled && (
                                                    <div style={{ borderTop: '1px dashed #dfe3e8', paddingTop: '20px', marginTop: '4px' }}>
                                                        <s-stack gap="base">
                                                            <s-text type="strong"><span style={{ fontSize: '14px' }}>{additionalDonationTitlePreview}</span></s-text>
                                                            <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                                                                <div style={{
                                                                    flex: 1,
                                                                    padding: '10px 14px',
                                                                    background: '#fff',
                                                                    border: '1px solid #dfe3e8',
                                                                    borderRadius: '8px',
                                                                    color: '#919eab',
                                                                    fontSize: '13px',
                                                                    display: 'flex',
                                                                    alignItems: 'center'
                                                                }}>
                                                                    {placeholderTextPreview}
                                                                </div>
                                                                <s-button disabled>{buttonTextPreview}</s-button>
                                                            </div>
                                                        </s-stack>
                                                    </div>
                                                )}
                                            </s-stack>
                                        </s-box>
                                    </s-box>

                                    <s-box padding="large" background="subdued" borderRadius="large">
                                        <s-stack direction="inline" gap="small" alignItems="start">
                                            <svg viewBox="0 0 20 20" style={{ width: '16px', height: '16px', fill: '#637381', marginTop: '2px' }}><path d="M10 2a8 8 0 1 0 8 8 8.009 8.009 0 0 0-8-8Zm0 14a6 6 0 1 1 6-6 6.007 6.007 0 0 1-6 6Zm-1-5h2v2H9v-2Zm0-6h2v4H9V5Z" /></svg>
                                            <s-text color="subdued">
                                                <span style={{ fontSize: '13px' }}>The preview reflects the calculations based on a sample cart total of <strong>$99.39</strong>.</span>
                                            </s-text>
                                        </s-stack>
                                    </s-box>
                                </s-stack>
                            </div>
                        </div>
                    </Form>
                </>
            )}

            {selectedTabIndex === 1 && (
                <ConfigurationTab
                    blocks={[
                        {
                            id: "roundup-cart",
                            title: "Cart Page Setup",
                            description: "To add the roundup donation section to your cart page, click the button below to insert the app block.",
                            themeEditorUrl: `https://admin.shopify.com/store/${(settings?.shop || "").split(".")[0]}/themes/current/editor?template=cart`,
                            buttonLabel: "Open Cart Editor ↗",
                            previewSvg: CART_PREVIEW_SVG,
                            enabled: enabled,
                            instructions: [
                                "Go to ", "Online Store", " ➺ ", "Themes", " ➺ Click on ", "Customize",
                                " ➺ Select ", "Cart Page", " Template ➺ Click ", "Add Block",
                                " ➺ Select ", "Round Up Donation"
                            ],
                            onToggle: (val) => setEnabled(val)
                        }
                    ]}
                />
            )}
        </s-page>
    );
}