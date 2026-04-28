-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosDonationSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "donationType" TEXT NOT NULL DEFAULT 'percentage',
    "donationValue" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "minimumValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "donationMessage" TEXT NOT NULL DEFAULT '{donationAmount} of {totalOrderValue} will be donated to charity',
    "tooltipMessage" TEXT NOT NULL DEFAULT 'A portion of your purchase supports charity',
    "orderTag" TEXT NOT NULL DEFAULT 'galaxy_pos_donation',
    "donationBasis" TEXT NOT NULL DEFAULT 'order',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PosDonationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'Uncategorized',
    "imageUrl" TEXT,
    "displayStyle" TEXT NOT NULL DEFAULT 'tabs',
    "donationAmounts" TEXT NOT NULL DEFAULT '[]',
    "allowOtherAmount" BOOLEAN NOT NULL DEFAULT true,
    "otherAmountTitle" TEXT NOT NULL DEFAULT 'Other',
    "shopifyProductId" TEXT,
    "shopifyVariantIds" TEXT NOT NULL DEFAULT '[]',
    "isRecurringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "orderId" TEXT,
    "orderNumber" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "donorEmail" TEXT,
    "donorName" TEXT,
    "message" TEXT,
    "shopifyProductId" TEXT,
    "shopifyVariantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockConfig" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productBlockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cartBlockEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BlockConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PosDonationLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "donationAmount" DOUBLE PRECISION NOT NULL,
    "orderTotal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'active',
    "receiptStatus" TEXT NOT NULL DEFAULT 'pending',
    "receiptSentAt" TIMESTAMP(3),
    "isResent" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'pos',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosDonationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL DEFAULT 'donations@yourstore.com',
    "ccEmail" TEXT DEFAULT '',
    "receiptSubject" TEXT NOT NULL DEFAULT 'Thank you for your donation',
    "receiptBody" TEXT NOT NULL DEFAULT 'We''ve received your generous donation of <strong>{{currency}}{{amount}}</strong> along with your order {{orderNumber}}.',
    "refundSubject" TEXT NOT NULL DEFAULT 'Donation Refund Confirmation',
    "refundBody" TEXT NOT NULL DEFAULT 'We''re writing to confirm that the donation of <strong>{{currency}}{{amount}}</strong> associated with order {{orderNumber}} has been refunded.',
    "cancelSubject" TEXT NOT NULL DEFAULT 'Donation Cancellation',
    "cancelBody" TEXT NOT NULL DEFAULT 'The donation of <strong>{{currency}}{{amount}}</strong> associated with your cancelled order {{orderNumber}} has also been marked as cancelled.',
    "pauseSubject" TEXT NOT NULL DEFAULT 'Subscription Paused',
    "pauseBody" TEXT NOT NULL DEFAULT 'Your subscription for <strong>{{donation_name}}</strong> has been paused.',
    "resumeSubject" TEXT NOT NULL DEFAULT 'Subscription Resumed',
    "resumeBody" TEXT NOT NULL DEFAULT 'Your subscription for <strong>{{donation_name}}</strong> has been resumed.',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanSubscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "subscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pendingPlan" TEXT,

    CONSTRAINT "PlanSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringDonationConfig" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL DEFAULT '9957801099511',
    "productGid" TEXT NOT NULL DEFAULT 'gid://shopify/Product/9957801099511',
    "sellingPlanGroupId" TEXT,
    "monthlyPlanId" TEXT,
    "weeklyPlanId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringDonationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "widgetTitle" TEXT NOT NULL DEFAULT 'Donation',
    "buttonText" TEXT NOT NULL DEFAULT 'Donate',
    "additionalCss" TEXT NOT NULL DEFAULT '',
    "displayThankYou" BOOLEAN NOT NULL DEFAULT true,
    "thankYouMessage" TEXT NOT NULL DEFAULT 'Thanks for Donating!!!!!!!',
    "sendReceipt" BOOLEAN NOT NULL DEFAULT true,
    "receiveReceipt" BOOLEAN NOT NULL DEFAULT true,
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "ccEmail" TEXT NOT NULL DEFAULT '',
    "subjectLine" TEXT NOT NULL DEFAULT 'Donation Receipt',
    "emailTemplate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringDonationLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT,
    "donationAmount" DOUBLE PRECISION NOT NULL,
    "orderTotal" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'active',
    "receiptStatus" TEXT NOT NULL DEFAULT 'pending',
    "receiptSentAt" TIMESTAMP(3),
    "sellingPlanId" TEXT,
    "subscriptionContractId" TEXT,
    "frequency" TEXT NOT NULL DEFAULT 'one_time',
    "isResent" BOOLEAN NOT NULL DEFAULT false,
    "type" TEXT NOT NULL DEFAULT 'recurring',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringDonationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundUpDonationSettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "campaignTitle" TEXT NOT NULL DEFAULT 'Donation for better society',
    "description" TEXT NOT NULL DEFAULT 'Your donation contributes to a better society.',
    "showImage" BOOLEAN NOT NULL DEFAULT true,
    "checkboxLabel" TEXT NOT NULL DEFAULT 'Yes, I want to donate (amount)',
    "rounding" TEXT NOT NULL DEFAULT 'nearest1',
    "donationOrderTag" TEXT NOT NULL DEFAULT 'roundUpDonation',
    "customAmount" TEXT,
    "imageUrl" TEXT,
    "additionalDonationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "additionalDonationTitle" TEXT NOT NULL DEFAULT 'Add an extra donation (optional)',
    "placeholderText" TEXT NOT NULL DEFAULT 'Enter amount',
    "buttonText" TEXT NOT NULL DEFAULT 'Donate',
    "productId" TEXT,
    "productHandle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoundUpDonationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "nextBillingDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSubscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "orderId" TEXT,
    "orderName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'Monthly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PosDonationSettings_shop_key" ON "PosDonationSettings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_orderId_shopifyVariantId_key" ON "Donation"("orderId", "shopifyVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "BlockConfig_shop_key" ON "BlockConfig"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "PosDonationLog_orderId_key" ON "PosDonationLog"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSettings_shop_key" ON "EmailSettings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "PlanSubscription_shop_key" ON "PlanSubscription"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringDonationConfig_shop_key" ON "RecurringDonationConfig"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "AppSettings_shop_key" ON "AppSettings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringDonationLog_orderId_key" ON "RecurringDonationLog"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundUpDonationSettings_shop_key" ON "RoundUpDonationSettings"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_orderId_key" ON "subscription"("orderId");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
