import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useNavigate, data, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { setupSellingPlans } from "../models/recurring.server";
import AddCampaign, { type CampaignFormData } from "../components/AddCampaign";
import { useState, useEffect } from "react";

/**
 * Upload a base64 data URL image to a Shopify product using the Staged Uploads API.
 * Returns the Shopify media GID on success, or null on failure (non-fatal).
 */
async function uploadImageToShopifyProduct(
  admin: any,
  productId: string,
  base64DataUrl: string,
): Promise<string | null> {
  try {
    // Parse the data URL: "data:<mime>;base64,<data>"
    const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.warn("Image upload skipped: invalid data URL format");
      return null;
    }
    const mimeType = match[1]; // e.g. "image/jpeg"
    const base64Data = match[2];
    const imageBuffer = Buffer.from(base64Data, "base64");
    const fileSize = imageBuffer.byteLength;
    const fileName = `campaign-image.${mimeType.split("/")[1] || "jpg"}`;

    console.log(`  Image: ${fileName}, size: ${fileSize} bytes, type: ${mimeType}`);

    // Step A: Request a staged upload URL from Shopify
    const stageRes = await admin.graphql(
      `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
        stagedUploadsCreate(input: $input) {
          stagedTargets {
            url
            resourceUrl
            parameters { name value }
          }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          input: [
            {
              resource: "PRODUCT_IMAGE",
              filename: fileName,
              mimeType,
              fileSize: String(fileSize),
              httpMethod: "POST",
            },
          ],
        },
      },
    );
    const stageJson: any = await stageRes.json();
    const stageErrors = stageJson.data?.stagedUploadsCreate?.userErrors || [];
    if (stageErrors.length > 0 || !stageJson.data?.stagedUploadsCreate?.stagedTargets?.length) {
      console.warn("Staged upload creation failed:", stageErrors);
      return null;
    }

    const target = stageJson.data.stagedUploadsCreate.stagedTargets[0];
    const uploadUrl: string = target.url;
    const resourceUrl: string = target.resourceUrl;
    const params: { name: string; value: string }[] = target.parameters || [];

    console.log("  Staged upload URL obtained, uploading image bytes...");

    // Step B: Upload the image bytes using multipart/form-data to the staged URL
    const formPayload = new FormData();
    params.forEach(({ name, value }) => formPayload.append(name, value));
    formPayload.append(
      "file",
      new Blob([imageBuffer], { type: mimeType }),
      fileName,
    );

    const uploadRes = await fetch(uploadUrl, { method: "POST", body: formPayload });
    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      console.warn("Staged upload PUT failed:", uploadRes.status, uploadErr);
      return null;
    }
    console.log("  Image bytes uploaded successfully.");

    // Step C: Attach the uploaded image to the product as media
    const mediaRes = await admin.graphql(
      `#graphql
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media { ... on MediaImage { id image { url } } }
          mediaUserErrors { field message }
          product { id }
        }
      }`,
      {
        variables: {
          productId,
          media: [
            {
              originalSource: resourceUrl,
              mediaContentType: "IMAGE",
              alt: "Campaign image",
            },
          ],
        },
      },
    );
    const mediaJson: any = await mediaRes.json();
    const mediaErrors = mediaJson.data?.productCreateMedia?.mediaUserErrors || [];
    if (mediaErrors.length > 0) {
      console.warn("productCreateMedia errors:", mediaErrors);
      return null;
    }
    // Return the CDN URL (not the GID) so the DB can store a lightweight URL
    const cdnUrl: string | null =
      mediaJson.data?.productCreateMedia?.media?.[0]?.image?.url ?? null;
    console.log("  Product media attached, CDN URL:", cdnUrl);
    return cdnUrl;
  } catch (err) {
    console.warn("uploadImageToShopifyProduct threw (non-fatal):", err);
    return null;
  }
}

const initialFormData: CampaignFormData = {
  name: "",
  description: "",
  imageUrl: "",
  enabled: true,

  displayStyle: "tabs",
  donationAmounts: [
    "0.01",
    "0.10",
    "1.00",
    "10.00",
    "100.00",
    "1000.00",
    "10",
    "20",
    "30",
    "40",
  ],
  allowOtherAmount: true,
  otherAmountTitle: "Other",
  isRecurringEnabled: false,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log("=== STARTING CAMPAIGN CREATION ===");

  try {
    console.log("Step 1: Authenticating...");
    const { session, admin } = await authenticate.admin(request);
    console.log("Authentication successful, shop:", session?.shop);

    console.log("Step 2: Parsing form data...");
    const formData = await request.formData();

    // Safeguard against null values from formData to prevent Prisma 'Invalid invocation' crashes
    const name = (formData.get("name") as string) || "";
    const description = (formData.get("description") as string) || "";
    const imageUrl = (formData.get("imageUrl") as string) || "";
    const enabled = formData.get("enabled") === "true";
    const displayStyle = (formData.get("displayStyle") as string) || "tabs";
    const donationAmountsRaw = (formData.get("donationAmounts") as string) || "[]";
    const allowOtherAmount = formData.get("allowOtherAmount") === "true";
    const otherAmountTitle = (formData.get("otherAmountTitle") as string) || "Other";
    const isRecurringEnabled = formData.get("isRecurringEnabled") === "true";

    console.log("Form parsing complete. Version: 1.0.2");

    if (!name || !description) {
      return data(
        { success: false, error: "Name and description are required" },
        { status: 400 },
      );
    }

    console.log("Step 3: Processing donation amounts...");
    let parsedAmounts: string[] = [];
    try {
      parsedAmounts = JSON.parse(donationAmountsRaw);
    } catch (e) {
      console.error("JSON parsing failed for donationAmounts:", donationAmountsRaw);
      return data({ success: false, error: "Invalid donation amounts format" }, { status: 400 });
    }

    const formattedSet = new Set<string>();
    parsedAmounts = parsedAmounts.filter((amount) => {
      const val = parseFloat(amount);
      if (isNaN(val)) return false;
      const formatted = `$${val.toFixed(2)}`;
      if (formattedSet.has(formatted)) return false;
      formattedSet.add(formatted);
      return true;
    });

    if (parsedAmounts.length === 0) {
      return data(
        { success: false, error: "At least one donation amount is required" },
        { status: 400 },
      );
    }

    const shop = session?.shop || "demo-shop";

    console.log("Step 4: Persisting campaign to local database...");
    let campaign;
    try {
      // Using 'as any' to bypass the 'category' property existence lint issue
      campaign = await prisma.campaign.create({
        data: {
          name,
          description,
          imageUrl,
          enabled,
          category: "Uncategorized",
          displayStyle,
          donationAmounts: donationAmountsRaw,
          allowOtherAmount,
          otherAmountTitle,
          shop,
          shopifyVariantIds: "[]",
          isRecurringEnabled,
        },
      });
      console.log("Prisma DB Record Created:", campaign.id);
    } catch (dmError: any) {
      console.error("CRITICAL PRISMA FAILURE:", dmError);
      return data({
        success: false,
        error: `Database save failed: ${dmError.message}`
      }, { status: 500 });
    }

    console.log("Step 5: Initialising Shopify Product Create...");

    const productResponse = await admin.graphql(
      `#graphql
      mutation CreateProduct($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          input: {
            title: name,
            descriptionHtml: `<p>${description}</p>`,
            status: enabled ? "ACTIVE" : "DRAFT",
            productType: "donation",
            // Omitting 'category' intentionally — Shopify treats omitted/null
            // category as "Uncategorized", which is the desired behaviour.
            tags: ["donation", "preset-donation"],
            vendor: "Donation App",
          },
        },
      },
    );

    const productJson: any = await productResponse.json();
    console.log("Shopify Product Result:", JSON.stringify(productJson, null, 2));

    if (productJson.errors || (productJson.data?.productCreate?.userErrors || []).length > 0) {
      const errorMsg = productJson.errors?.[0]?.message || productJson.data?.productCreate?.userErrors?.[0]?.message || "Shopify product create failed";
      console.error("Shopify Creation Error:", errorMsg);
      await prisma.campaign.delete({ where: { id: campaign.id } });
      return data({ success: false, error: errorMsg }, { status: 500 });
    }

    const shopifyProductId = productJson.data.productCreate.product.id;

    console.log("Step 6: Forcing product category to Uncategorized...");
    // Shopify may auto-assign a taxonomy category on creation based on the
    // product title / productType. We explicitly unset it (= Uncategorized)
    // with a follow-up productUpdate setting category to null.
    try {
      const uncatResponse = await admin.graphql(
        `#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id category { id name } }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            input: {
              id: shopifyProductId,
              category: null,
            },
          },
        },
      );
      const uncatJson: any = await uncatResponse.json();
      const uncatErrors = uncatJson.data?.productUpdate?.userErrors || [];
      if (uncatErrors.length > 0) {
        console.warn("Could not unset category (non-fatal):", uncatErrors);
      } else {
        const catName = uncatJson.data?.productUpdate?.product?.category?.name ?? "Uncategorized";
        console.log("Product category confirmed:", catName);
      }
    } catch (uncatErr) {
      // Non-fatal — product still created successfully without explicit category
      console.warn("Category update failed (non-fatal):", uncatErr);
    }



    console.log("Step 6.5: Uploading campaign image to Shopify product media...");
    if (imageUrl && imageUrl.startsWith("data:")) {
      const cdnUrl = await uploadImageToShopifyProduct(admin, shopifyProductId, imageUrl);
      if (cdnUrl) {
        console.log("Campaign image successfully attached to Shopify product:", cdnUrl);
        // Replace the base64 in the DB with the lightweight Shopify CDN URL
        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { imageUrl: cdnUrl },
        });
        console.log("Campaign imageUrl in DB updated to CDN URL.");
      } else {
        console.warn("Campaign image upload failed (non-fatal) — product created without image.");
      }
    } else {
      console.log("No image provided for this campaign, skipping media upload.");
    }

    console.log("Step 7: Generation of Product Variants...");

    const finalAmounts = [...new Set([...parsedAmounts, "1.00"])];
    const variantsInput = finalAmounts.map((amount) => ({
      price: parseFloat(amount).toFixed(2),
      inventoryPolicy: "CONTINUE",
      inventoryItem: {
        tracked: false,
        requiresShipping: false,
      },
      optionValues: [
        {
          optionName: "Title",
          name: `$${parseFloat(amount).toFixed(2)}`,
        },
      ],
    }));

    const variantResponse = await admin.graphql(
      `#graphql
      mutation ProductVariantsBulkCreate($productId: ID!, $strategy: ProductVariantsBulkCreateStrategy, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, strategy: $strategy, variants: $variants) {
          productVariants { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          productId: shopifyProductId,
          strategy: "REMOVE_STANDALONE_VARIANT",
          variants: variantsInput,
        },
      },
    );

    const variantJson: any = await variantResponse.json();
    const variantUserErrors = variantJson.data?.productVariantsBulkCreate?.userErrors || [];
    if (variantUserErrors.length > 0) {
      console.error("Variant Errors:", variantUserErrors);
      return data({ success: false, error: variantUserErrors[0].message }, { status: 500 });
    }

    // Re-fetch variants with their prices to build an order-guaranteed mapping.
    // Shopify does NOT guarantee productVariantsBulkCreate returns variants
    // in the same order as the input array, so we must sort by price.
    const createdVariantGids: string[] = (variantJson.data?.productVariantsBulkCreate?.productVariants || []).map((v: any) => v.id);
    console.log("Variants created (raw order):", createdVariantGids.length);

    const refetchRes = await admin.graphql(
      `#graphql
      query getVariantPrices($id: ID!) {
        product(id: $id) {
          variants(first: 50) {
            nodes { id price }
          }
        }
      }`,
      { variables: { id: shopifyProductId } }
    );
    const refetchJson: any = await refetchRes.json();
    const fetchedVariants: { id: string; price: string }[] =
      refetchJson.data?.product?.variants?.nodes || [];

    // Build price -> variantId lookup (formatted to 2 decimal places)
    const priceToVariantId: Record<string, string> = {};
    fetchedVariants.forEach((v) => {
      priceToVariantId[parseFloat(v.price).toFixed(2)] = v.id;
    });

    // Re-order variantIds to match finalAmounts order
    const variantIds: string[] = finalAmounts.map((amt) => {
      const key = parseFloat(String(amt)).toFixed(2);
      return priceToVariantId[key] || "";
    }).filter(Boolean);

    console.log("Variants ordered by amount:", variantIds.length);

    console.log("Step 7.5: Publishing product to Online Store...");
    try {
      const pubResponse = await admin.graphql(
        `#graphql
        query getPublications {
          publications(first: 50) {
            edges {
              node {
                id
                name
              }
            }
          }
        }`
      );
      const pubJson = await pubResponse.json();
      const allPubs = pubJson.data?.publications?.edges || [];
      const onlineStorePub = allPubs.find(
        (edge: any) => edge.node.name === "Online Store"
      )?.node;

      if (onlineStorePub?.id) {
        console.log("Found Online Store publication:", onlineStorePub.id);
        const publishResponse = await admin.graphql(
          `#graphql
          mutation publishProduct($id: ID!, $input: [PublicationInput!]!) {
            publishablePublish(id: $id, input: $input) {
              publishable {
                availablePublicationsCount {
                  count
                }
              }
              userErrors {
                field
                message
              }
            }
          }`,
          {
            variables: {
              id: shopifyProductId,
              input: [{ publicationId: onlineStorePub.id }],
            },
          }
        );
        const publishJson: any = await publishResponse.json();
        const publishErrors = publishJson.data?.publishablePublish?.userErrors || [];
        if (publishJson.errors || publishErrors.length > 0) {
          console.error("Errors publishing product:", publishJson.errors || publishErrors);
        } else {
          console.log("Product published to Online Store successfully!");
        }
      } else {
        console.error("Could not find Online Store publication channel in: ", JSON.stringify(allPubs));
      }
    } catch (err) {
      console.error("Failed to publish product:", err);
    }

    console.log("Step 8: Updating campaign with Shopify IDs...");
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        shopifyProductId,
        shopifyVariantIds: JSON.stringify(variantIds),
        donationAmounts: JSON.stringify(finalAmounts),
      },
    });

    if (isRecurringEnabled) {
      console.log("Step 9: Setting up recurring selling plans...");
      try {
        await setupSellingPlans(admin, session.shop, shopifyProductId);
        console.log("Recurring selling plans attached successfully.");
      } catch (setupErr) {
        console.warn("Error setting up recurring plans (non-fatal):", setupErr);
      }
    }

    console.log("=== CAMPAIGN CREATION SUCCESS ===");
    console.log({
      campaignId: campaign.id,
      shopifyProductId,
      variantIds,
    });

    return data({
      success: true,
      campaignId: campaign.id,
      shopifyProductId,
      variantCount: variantIds.length,
    });
  } catch (error) {
    console.error("=== ERROR IN CAMPAIGN CREATION ===");
    console.error("Error type:", typeof error);
    console.error("Error:", error);

    let errorMessage = "An error occurred. Please try again.";

    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else if (typeof error === "string") {
      errorMessage = error || errorMessage;
    } else if (error && typeof error === "object") {
      console.error("Error object:", JSON.stringify(error, null, 2));
    }

    return data({ success: false, error: errorMessage }, { status: 500 });
  }
};

export default function AddCampaignPage() {
  const navigate = useNavigate();
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const isSubmitting = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (fetcher.data.success) {
        setSubmitSuccess(true);
        setSubmitError(null);
        setTimeout(() => {
          navigate("/app/preset-donation");
        }, 1500);
      } else {
        setSubmitError(
          fetcher.data.error || "An error occurred. Please try again.",
        );
        setSubmitSuccess(false);
      }
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const handleFormChange = (changes: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...changes }));
    if (submitError) setSubmitError(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setSubmitError("Please enter a campaign title");
      return;
    }
    if (!formData.description.trim()) {
      setSubmitError("Please enter a campaign description");
      return;
    }
    if (formData.donationAmounts.length === 0) {
      setSubmitError("Please add at least one donation amount");
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(false);

    const formDataToSubmit = new FormData();
    formDataToSubmit.append("name", formData.name);
    formDataToSubmit.append("description", formData.description);
    formDataToSubmit.append("imageUrl", formData.imageUrl);
    formDataToSubmit.append("enabled", String(formData.enabled));
    formDataToSubmit.append("displayStyle", formData.displayStyle);
    formDataToSubmit.append(
      "donationAmounts",
      JSON.stringify(formData.donationAmounts),
    );
    formDataToSubmit.append(
      "allowOtherAmount",
      String(formData.allowOtherAmount),
    );
    formDataToSubmit.append("otherAmountTitle", formData.otherAmountTitle);
    formDataToSubmit.append("isRecurringEnabled", String(formData.isRecurringEnabled));

    fetcher.submit(formDataToSubmit, { method: "post" });
  };

  const handleCancel = () => {
    navigate("/app/preset-donation");
  };

  return (
    <s-page heading="Add Campaign">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Save Campaign"}
      </s-button>
      <s-button
        slot="secondary-action"
        onClick={handleCancel}
        disabled={isSubmitting}
      >
        Cancel
      </s-button>

      {submitSuccess && (
        <s-banner tone="success">
          <s-paragraph>
            Campaign created successfully! Redirecting...
          </s-paragraph>
        </s-banner>
      )}

      {submitError && (
        <s-banner tone="critical">
          <s-paragraph>{submitError}</s-paragraph>
        </s-banner>
      )}

      <div style={{ marginTop: '24px' }}>
        <AddCampaign formData={formData} onFormChange={handleFormChange} />
      </div>
    </s-page>
  );
}
