import type { ActionFunctionArgs } from "react-router";
import { data } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const id = params.id;
  
  if (!id) {
    return data({ error: "Missing ID" }, { status: 400 });
  }
  
  const campaign = await prisma.campaign.findUnique({
    where: { id }
  });
  
  if (!campaign) {
    return data({ error: "Campaign not found" }, { status: 404 });
  }
  
  if (campaign.shopifyProductId) {
    try {
      const response = await admin.graphql(
        `#graphql
        mutation productDelete($input: ProductDeleteInput!) {
          productDelete(input: $input) {
            deletedProductId
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            input: {
              id: campaign.shopifyProductId
            }
          }
        }
      );
      const json = await response.json();
      if (json.data?.productDelete?.userErrors?.length > 0) {
        console.error("Failed to delete product from Shopify:", json.data.productDelete.userErrors);
      }
    } catch (e) {
      console.error("Error communicating with Shopify Admin API:", e);
    }
  }
  
  await prisma.campaign.delete({
    where: { id }
  });
  
  return data({ success: true });
};
