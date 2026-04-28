import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    await authenticate.admin(request);
    return null;
};

export default function PresetDonationPage() {
    return (
        <s-page heading="Preset Donations">
            <s-layout>
                <s-layout-section>
                    <s-card>
                        <div style={{ padding: "20px", textAlign: "center" }}>
                            <div style={{ fontSize: "16px", color: "#6D7175" }}>
                                Preset donation configuration is under development.
                            </div>
                        </div>
                    </s-card>
                </s-layout-section>
            </s-layout>
        </s-page>
    );
}
