import { shopifyApi, ApiVersion, Session } from "@shopify/shopify-api";
import 'dotenv/config';

async function createMetafieldDefinition() {
    const shopify = shopifyApi({
        apiKey: process.env.SHOPIFY_API_KEY || '',
        apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
        scopes: ['write_metafields'],
        hostName: process.env.SHOPIFY_APP_URL?.replace('https://', '') || '',
        apiVersion: ApiVersion.July24,
        isEmbeddedApp: true,
    });

    const session = new Session({
        id: 'session-id',
        shop: process.env.SHOPIFY_SHOP_DOMAIN || '',
        state: 'state',
        isOnline: true,
        accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
    });

    const client = new shopify.clients.Graphql({ session });

    // First, try to create the metafield definition
    const mutation = `
        mutation CreateMetafieldDefinition {
            metafieldDefinitionCreate(
                definition: {
                    name: "POS Donation Settings"
                    namespace: "pos_donation"
                    key: "settings"
                    type: "json"
                    description: "Dynamic POS donation settings from app"
                    ownerType: SHOP
                }
            ) {
                createdDefinition {
                    id
                    name
                    key
                    namespace
                }
                userErrors {
                    field
                    message
                }
            }
        }
    `;

    try {
        const response = await client.query({
            data: mutation,
        });

        const data = response.body as any;

        if (data.data?.metafieldDefinitionCreate?.userErrors?.length > 0) {
            console.error("Errors creating metafield definition:",
                data.data.metafieldDefinitionCreate.userErrors);
        } else {
            console.log("Metafield definition created:",
                JSON.stringify(data.data.metafieldDefinitionCreate.createdDefinition, null, 2));
        }
    } catch (error) {
        console.error("Error creating metafield definition:", error);
    }
}

createMetafieldDefinition();