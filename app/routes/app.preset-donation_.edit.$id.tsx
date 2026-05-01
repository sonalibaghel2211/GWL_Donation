import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useNavigate, data, useFetcher, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { setupSellingPlans } from "../models/recurring.server";
import AddCampaign, { type CampaignFormData } from "../components/AddCampaign";
import { useState, useEffect, useMemo } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: replace all media on a Shopify product with a new base64 image.
// Returns the new Shopify CDN image URL on success, null on failure.
// Steps:
//   1. Query the product's existing media IDs.
//   2. Delete old media first to avoid race conditions
//   3. Stage-upload the new image bytes.
//   4. Attach new media via productCreateMedia.
//   5. Set new media as product's featured media
// Non-fatal — errors are logged but never thrown.
// ─────────────────────────────────────────────────────────────────────────────
async function replaceProductImage(
  admin: any,
  productId: string,
  base64DataUrl: string,
): Promise<string | null> {
  try {
    // ── Step 1: Collect existing media IDs ──────────────────────────────────
    const mediaQueryRes = await admin.graphql(
      `#graphql
      query getProductMedia($id: ID!) {
        product(id: $id) {
          media(first: 20) {
            edges { node { id } }
          }
        }
      }`,
      { variables: { id: productId } },
    );
    const mediaQueryJson: any = await mediaQueryRes.json();
    const existingMediaIds: string[] =
      mediaQueryJson.data?.product?.media?.edges?.map((e: any) => e.node.id) ??
      [];
    console.log(
      `Found ${existingMediaIds.length} existing media item(s) on product ${productId}.`,
    );

    // ── Step 2: Delete old media first ─────────────────────────────────────
    if (existingMediaIds.length > 0) {
      const deleteRes = await admin.graphql(
        `#graphql
        mutation productDeleteMedia($productId: ID!, $mediaIds: [ID!]!) {
          productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
            deletedMediaIds
            product { id }
            mediaUserErrors { field message }
          }
        }`,
        { variables: { productId, mediaIds: existingMediaIds } },
      );
      const deleteJson: any = await deleteRes.json();
      const deleteErrors =
        deleteJson.data?.productDeleteMedia?.mediaUserErrors ?? [];
      if (deleteErrors.length > 0) {
        console.warn("productDeleteMedia errors (non-fatal):", deleteErrors);
      } else {
        console.log(
          `Deleted ${existingMediaIds.length} old media item(s) from product.`,
        );
      }
    }

    // ── Step 3: Parse the data URL ──────────────────────────────────────────
    const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.warn("Image replace skipped: invalid data URL format.");
      return null;
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const imageBuffer = Buffer.from(base64Data, "base64");
    const fileSize = imageBuffer.byteLength;
    const fileName = `campaign-image.${mimeType.split("/")[1] || "jpg"}`;
    console.log(
      `Uploading new image: ${fileName} (${fileSize} bytes, ${mimeType})`,
    );

    // ── Step 4: Request a staged upload URL ────────────────────────────────
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
    const stageErrors = stageJson.data?.stagedUploadsCreate?.userErrors ?? [];
    if (
      stageErrors.length > 0 ||
      !stageJson.data?.stagedUploadsCreate?.stagedTargets?.length
    ) {
      console.warn("Staged upload creation failed:", stageErrors);
      return null;
    }
    const target = stageJson.data.stagedUploadsCreate.stagedTargets[0];
    const uploadUrl: string = target.url;
    const resourceUrl: string = target.resourceUrl;
    const params: { name: string; value: string }[] = target.parameters ?? [];

    // ── Step 5: Upload the image bytes to the staged URL ──────────────────
    const formPayload = new FormData();
    params.forEach(({ name, value }) => formPayload.append(name, value));
    formPayload.append(
      "file",
      new Blob([imageBuffer], { type: mimeType }),
      fileName,
    );
    const uploadRes = await fetch(uploadUrl, {
      method: "POST",
      body: formPayload,
    });
    if (!uploadRes.ok) {
      console.warn(
        "Staged image upload failed:",
        uploadRes.status,
        await uploadRes.text(),
      );
      return null;
    }
    console.log("New image bytes uploaded successfully.");

    // ── Step 6: Attach new image to the product ────────────────────────────
    const mediaRes = await admin.graphql(
      `#graphql
      mutation productCreateMedia($productId: ID!, $media: [CreateMediaInput!]!) {
        productCreateMedia(productId: $productId, media: $media) {
          media {
            ... on MediaImage {
              id
              image { url }
            }
          }
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
    const mediaErrors =
      mediaJson.data?.productCreateMedia?.mediaUserErrors ?? [];
    if (mediaErrors.length > 0) {
      console.warn("productCreateMedia errors:", mediaErrors);
      return null;
    }

    const newMedia = mediaJson.data?.productCreateMedia?.media?.[0];
    const newMediaId: string | null = newMedia?.id ?? null;
    const cdnUrl: string | null = newMedia?.image?.url ?? null;
    console.log("New product image attached, CDN URL:", cdnUrl);

    // ── Step 7: Set new media as featured media ───────────────────────────
    if (newMediaId) {
      const featuredRes = await admin.graphql(
        `#graphql
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              featuredMedia {
                id
              }
            }
            userErrors { field message }
          }
        }`,
        {
          variables: {
            input: {
              id: productId,
              featuredMediaId: newMediaId,
            },
          },
        },
      );
      const featuredJson: any = await featuredRes.json();
      const featuredErrors = featuredJson.data?.productUpdate?.userErrors ?? [];
      if (featuredErrors.length > 0) {
        console.warn(
          "productUpdate (featuredMedia) errors (non-fatal):",
          featuredErrors,
        );
      } else {
        console.log("Set new image as product featured media successfully.");
      }
    }

    return cdnUrl;
  } catch (err) {
    console.warn("replaceProductImage threw (non-fatal):", err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader
// ─────────────────────────────────────────────────────────────────────────────
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const id = params.id;
  if (!id) throw new Response("Missing id parameter", { status: 400 });

  const campaign = await prisma.campaign.findUnique({ where: { id } });
  if (!campaign) throw new Response("Campaign Not Found", { status: 404 });
  if (campaign.shop !== session.shop)
    throw new Response("Forbidden", { status: 403 });

  let donationAmounts = ["5", "10", "25"];
  if (campaign.donationAmounts) {
    try {
      donationAmounts = JSON.parse(campaign.donationAmounts);
    } catch {
      donationAmounts = ["5", "10", "25"];
    }
  }

  const initialFormData: CampaignFormData = {
    name: campaign.name,
    description: campaign.description,
    imageUrl: campaign.imageUrl || "",
    enabled: campaign.enabled,
    displayStyle: campaign.displayStyle,
    donationAmounts,
    allowOtherAmount: campaign.allowOtherAmount,
    otherAmountTitle: campaign.otherAmountTitle,
    isRecurringEnabled: campaign.isRecurringEnabled,
  };

  const response = await admin.graphql(`
      query {
          shop {
              currencyCode
          }
      }
  `);
  const shopData = await response.json();
  const currency = shopData.data?.shop?.currencyCode || "USD";

  return { campaign, initialFormData, currency };
};

// ─────────────────────────────────────────────────────────────────────────────
// Action
// ─────────────────────────────────────────────────────────────────────────────
export const action = async ({ request, params }: ActionFunctionArgs) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const id = params.id;
    if (!id) return data({ error: "Missing ID" }, { status: 400 });

    const response = await admin.graphql(`
        query {
            shop {
                currencyCode
            }
        }
    `);
    const shopData = await response.json();
    const currency = shopData.data?.shop?.currencyCode || "USD";
    const moneyFormatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
    });

    const formData = await request.formData();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const imageUrl = (formData.get("imageUrl") as string) || "";
    const enabled = formData.get("enabled") === "true";
    const displayStyle = (formData.get("displayStyle") as string) || "tabs";
    const donationAmounts = (formData.get("donationAmounts") as string) || "[]";
    const allowOtherAmount = formData.get("allowOtherAmount") === "true";
    const otherAmountTitle =
      (formData.get("otherAmountTitle") as string) || "Other";
    const isRecurringEnabled = formData.get("isRecurringEnabled") === "true";

    if (!name || !description) {
      return data(
        { error: "Name and description are required" },
        { status: 400 },
      );
    }

    // ── 1. Load current record to diff against ──────────────────────────────
    const existing = await prisma.campaign.findUnique({ where: { id } });
    if (!existing)
      return data({ error: "Campaign not found" }, { status: 404 });
    if (existing.shop !== session.shop)
      return data({ error: "Forbidden" }, { status: 403 });

    console.log("[ACTION] === Starting campaign update ===");
    console.log("[ACTION] Campaign ID:", id);
    console.log(
      "[ACTION] Submitted imageUrl:",
      imageUrl ? `length=${imageUrl.length}` : "empty",
    );
    console.log("[ACTION] Existing imageUrl:", existing.imageUrl ?? "null");
    console.log(
      "[ACTION] ShopifyProductId:",
      existing.shopifyProductId ?? "null",
    );

    // ── 2. Determine if image needs updating ──────────────────────────────────
    const existingUrl = existing.imageUrl ?? "";
    const imageIsDifferent = imageUrl !== existingUrl;
    let newImageUrl = existingUrl;
    let imageNeedsDbUpdate = false;

    console.log("[ACTION] imageUrl submitted:", imageUrl ? `length=${imageUrl.length}` : "empty");
    console.log("[ACTION] existingUrl:", existingUrl);
    console.log("[ACTION] imageIsDifferent:", imageIsDifferent);

    // ── 3. Process image (upload to Shopify if needed) ────────────────────────
    if (imageIsDifferent) {
      imageNeedsDbUpdate = true;
      if (imageUrl.startsWith("data:")) {
        console.log("[ACTION] Processing new image upload to Shopify...");
        if (existing.shopifyProductId) {
          const cdnUrl = await replaceProductImage(
            admin,
            existing.shopifyProductId,
            imageUrl,
          );
          if (cdnUrl) {
            newImageUrl = cdnUrl;
            console.log("[ACTION] Shopify upload SUCCESS, new URL:", cdnUrl);
          } else {
            console.warn("[ACTION] Shopify upload failed, storing base64 in DB as fallback");
            newImageUrl = imageUrl;
          }
        } else {
          newImageUrl = imageUrl;
        }
      } else {
        console.log("[ACTION] Image removed or set to non-base64 string");
        newImageUrl = imageUrl;
      }
    }

    // ── 4. Build DB patch ────────────────────────────────────────────────────
    const dbPatch: Record<string, unknown> = {};

    if (name !== existing.name) dbPatch.name = name;
    if (description !== existing.description) dbPatch.description = description;
    if (imageNeedsDbUpdate) dbPatch.imageUrl = newImageUrl;
    if (enabled !== existing.enabled) dbPatch.enabled = enabled;
    if (displayStyle !== existing.displayStyle)
      dbPatch.displayStyle = displayStyle;
    if (donationAmounts !== existing.donationAmounts)
      dbPatch.donationAmounts = donationAmounts;
    if (allowOtherAmount !== existing.allowOtherAmount)
      dbPatch.allowOtherAmount = allowOtherAmount;
    if (otherAmountTitle !== existing.otherAmountTitle)
      dbPatch.otherAmountTitle = otherAmountTitle;
    if (isRecurringEnabled !== existing.isRecurringEnabled)
      dbPatch.isRecurringEnabled = isRecurringEnabled;

    console.log("[ACTION] DB patch:", JSON.stringify(dbPatch));

    // ── 5. Update database ──────────────────────────────────────────────────
    const campaign =
      Object.keys(dbPatch).length > 0
        ? await prisma.campaign.update({ where: { id }, data: dbPatch })
        : existing;

    console.log(
      "[ACTION] Database updated, new imageUrl:",
      campaign.imageUrl ?? "null",
    );

    // ── 5.5 Sync Variants ──────────────────────────────────
    let newVariantIdsStr = campaign.shopifyVariantIds;
    if (existing.shopifyProductId) {
      console.log("[ACTION] Syncing variants to Shopify...");
      try {
        let parsedAmounts = JSON.parse(donationAmounts as string);

        const formattedSet = new Set<string>();
        parsedAmounts = parsedAmounts.filter((amount: string) => {
          // Robust parsing: strip non-numeric characters except decimal point
          const val = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
          if (isNaN(val)) return false;
          const formatted = moneyFormatter.format(val);
          if (formattedSet.has(formatted)) return false;
          formattedSet.add(formatted);
          return true;
        });

        // 1. Fetch current variants
        const currentVResponse = await admin.graphql(
          `#graphql
          query getProductVariants($id: ID!) {
            product(id: $id) {
              variants(first: 20) {
                nodes { id }
              }
            }
          }`,
          { variables: { id: existing.shopifyProductId } }
        );
        const currentVJson: any = await currentVResponse.json();
        const existingVids = currentVJson.data?.product?.variants?.nodes.map((v: any) => v.id) || [];

        // 2. Clear them if they exist
        if (existingVids.length > 0) {
          await admin.graphql(
            `#graphql
            mutation productVariantsBulkDelete($productId: ID!, $variantsIds: [ID!]!) {
              productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
                userErrors { field message }
              }
            }`,
            { variables: { productId: existing.shopifyProductId, variantsIds: existingVids } }
          );
        }

        const finalAmounts = [...new Set([...parsedAmounts, "1.00"])];
        const variantsInput = finalAmounts.map((amount: string) => {
          const val = parseFloat(String(amount).replace(/[^0-9.]/g, ''));
          return {
            price: val.toFixed(2),
            inventoryPolicy: "CONTINUE",
            inventoryItem: { tracked: false, requiresShipping: false },
            optionValues: [
              { optionName: "Title", name: moneyFormatter.format(val) },
            ],
          };
        });

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
              productId: existing.shopifyProductId,
              strategy: "REMOVE_STANDALONE_VARIANT",
              variants: variantsInput,
            },
          },
        );

        const variantJson: any = await variantResponse.json();
        const variantUserErrors = variantJson.data?.productVariantsBulkCreate?.userErrors || [];

        if (variantUserErrors.length > 0) {
          console.error("Variant Errors:", variantUserErrors);
        } else {
          console.log("Variants synced successfully (raw order):", variantJson.data?.productVariantsBulkCreate?.productVariants?.length);

          // Re-fetch variants with prices to build an order-guaranteed mapping.
          // Shopify does NOT guarantee productVariantsBulkCreate returns variants
          // in the same order as the input array, so we sort by price.
          const refetchRes = await admin.graphql(
            `#graphql
            query getVariantPrices($id: ID!) {
              product(id: $id) {
                variants(first: 50) {
                  nodes { id price }
                }
              }
            }`,
            { variables: { id: existing.shopifyProductId } }
          );
          const refetchJson: any = await refetchRes.json();
          const fetchedVariants: { id: string; price: string }[] =
            refetchJson.data?.product?.variants?.nodes || [];

          // Build price -> variantId lookup (2 decimal places)
          const priceToVariantId: Record<string, string> = {};
          fetchedVariants.forEach((v) => {
            priceToVariantId[parseFloat(v.price).toFixed(2)] = v.id;
          });

          // Re-order variantIds to match finalAmounts order
          const orderedVariantIds: string[] = finalAmounts.map((amt: string) => {
            const key = parseFloat(String(amt).replace(/[^0-9.]/g, '')).toFixed(2);
            return priceToVariantId[key] || "";
          }).filter(Boolean);

          newVariantIdsStr = JSON.stringify(orderedVariantIds);
          console.log("Variants ordered by amount:", orderedVariantIds.length);

          await prisma.campaign.update({
            where: { id: existing.id },
            data: {
              shopifyVariantIds: newVariantIdsStr,
              donationAmounts: JSON.stringify(finalAmounts)
            }
          });

          // ── Re-activate product ─────────────────────────────────────────────
          // Shopify automatically sets a product to DRAFT when ALL its variants
          // are deleted. We must call productUpdate to restore ACTIVE status after
          // the new variants are created, otherwise the product cannot be purchased.
          try {
            await admin.graphql(
              `#graphql
              mutation productUpdate($input: ProductInput!) {
                productUpdate(input: $input) {
                  product { id status }
                }
              }`,
              {
                variables: {
                  input: {
                    id: existing.shopifyProductId,
                    status: "ACTIVE",
                  },
                },
              }
            );
            console.log("[ACTION] Reactivated product to ACTIVE status.");
          } catch (reactivateErr) {
            console.warn("[ACTION] Non-fatal: could not reactivate product:", reactivateErr);
          }
        }
      } catch (e) {
        console.error("Failed to sync variants:", e);
      }
    }

    // ── 6. Sync to Shopify product ───────────────────────────────────────────
    if (existing.shopifyProductId) {
      console.log("[ACTION] Syncing campaign data to Shopify product...");

      const shopifyInput: Record<string, unknown> = {
        id: existing.shopifyProductId,
        metafields: [
          {
            namespace: "$app",
            key: "campaign_data",
            value: JSON.stringify({
              displayStyle: campaign.displayStyle,
              allowOtherAmount: campaign.allowOtherAmount,
              otherAmountTitle: campaign.otherAmountTitle,
              // Omit imageUrl from metafield if it is base64 (too large)
              imageUrl: campaign.imageUrl?.startsWith('data:') ? null : campaign.imageUrl,
              isRecurringEnabled: campaign.isRecurringEnabled,
            }),
            type: "json",
          },
        ],
      };

      const productResponse = await admin.graphql(
        `#graphql
        mutation UpdateDonationProduct($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id }
            userErrors { field message }
          }
        }`,
        { variables: { input: shopifyInput } },
      );

      const productJson = await productResponse.json();
      if (productJson.data?.productUpdate?.userErrors?.length > 0) {
        console.error("[ACTION] Shopify errors:", productJson.data.productUpdate.userErrors);
      } else {
        console.log("[ACTION] Shopify product updated successfully");
      }
    }

    // ── 7. Handle Recurring Donation Setting ────────────────────────────────
    if (isRecurringEnabled) {
      console.log("[ACTION] Recurring enabled, ensuring selling plans are synced...");
      try {
        await setupSellingPlans(admin, session.shop, existing.shopifyProductId!);
        console.log("[ACTION] Selling plans setup successfully.");
      } catch (e) {
        console.warn("[ACTION] Error setting up recurring (non-fatal):", e);
      }
    } else if (existing.isRecurringEnabled) {
      // Was enabled, now disabled
      console.log("[ACTION] Recurring disabled, removing selling plans...");
      try {
        const config = await prisma.recurringDonationConfig.findUnique({ where: { shop: existing.shop } });
        if (config?.sellingPlanGroupId && existing.shopifyProductId) {
          await admin.graphql(
            `#graphql
            mutation sellingPlanGroupRemoveProducts($id: ID!, $productIds: [ID!]!) {
              sellingPlanGroupRemoveProducts(id: $id, productIds: $productIds) {
                removedProductIds
                userErrors { field message }
              }
            }`,
            {
              variables: {
                id: config.sellingPlanGroupId,
                productIds: [existing.shopifyProductId],
              },
            }
          );
        }
      } catch (e) {
        console.warn("[ACTION] Error removing recurring (non-fatal):", e);
      }
    }

    console.log("[ACTION] === Campaign update complete ===");
    return data({ success: true, campaignId: campaign.id });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return data(
      { error: "Failed to update campaign: " + (error as Error).message },
      { status: 500 },
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function EditCampaignPage() {
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const { initialFormData, currency } = useLoaderData<typeof loader>();
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  
  // Compute isDirty by comparing current formData with initialFormData
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  }, [formData, initialFormData]);

  const isSubmitting = fetcher.state === "submitting";

  const handleFormChange = (changes: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...changes }));
  };

  const handleSave = () => {
    console.log("[Edit Page] handleSave called");
    console.log(
      "[Edit Page] formData.imageUrl:",
      formData.imageUrl
        ? `(${formData.imageUrl.length} chars, ${formData.imageUrl.substring(0, 50)}...)`
        : "empty",
    );

    const fd = new FormData();
    fd.append("name", formData.name);
    fd.append("description", formData.description);
    fd.append("imageUrl", formData.imageUrl);
    fd.append("enabled", String(formData.enabled));
    fd.append("displayStyle", formData.displayStyle);
    fd.append("donationAmounts", JSON.stringify(formData.donationAmounts));
    fd.append("allowOtherAmount", String(formData.allowOtherAmount));
    fd.append("otherAmountTitle", formData.otherAmountTitle);
    fd.append("isRecurringEnabled", String(formData.isRecurringEnabled));

    console.log("[Edit Page] FormData created, submitting...");
    fetcher.submit(fd, { method: "post" });
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      navigate("/app/preset-donation");
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const handleCancel = () => navigate("/app/preset-donation");

  return (
    <s-page heading="Edit Campaign">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        disabled={isSubmitting || !isDirty}
      >
        {isSubmitting ? "Saving..." : (isDirty ? "Save Changes" : "No Changes")}
      </s-button>
      <s-button
        slot="secondary-action"
        onClick={handleCancel}
        disabled={isSubmitting}
      >
        Cancel
      </s-button>
      <div style={{ marginTop: '24px' }}>
        <AddCampaign formData={formData} onFormChange={handleFormChange} currency={currency} />
      </div>
    </s-page>
  );
}
