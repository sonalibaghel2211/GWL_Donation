-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NOT NULL,
    `isOnline` BOOLEAN NOT NULL DEFAULT false,
    `scope` TEXT NULL,
    `expires` DATETIME(3) NULL,
    `accessToken` TEXT NOT NULL,
    `userId` BIGINT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `accountOwner` BOOLEAN NOT NULL DEFAULT false,
    `locale` VARCHAR(191) NULL,
    `collaborator` BOOLEAN NULL DEFAULT false,
    `emailVerified` BOOLEAN NULL DEFAULT false,
    `refreshToken` TEXT NULL,
    `refreshTokenExpires` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PosDonationSettings` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `donationType` VARCHAR(191) NOT NULL DEFAULT 'percentage',
    `donationValue` DOUBLE NOT NULL DEFAULT 5.0,
    `minimumValue` DOUBLE NOT NULL DEFAULT 0,
    `donationMessage` TEXT NOT NULL,
    `tooltipMessage` VARCHAR(191) NOT NULL DEFAULT 'A portion of your purchase supports charity',
    `orderTag` VARCHAR(191) NOT NULL DEFAULT 'galaxy_pos_donation',
    `donationBasis` VARCHAR(191) NOT NULL DEFAULT 'order',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PosDonationSettings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Campaign` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `category` VARCHAR(191) NOT NULL DEFAULT 'Uncategorized',
    `imageUrl` LONGTEXT NULL,
    `displayStyle` VARCHAR(191) NOT NULL DEFAULT 'tabs',
    `donationAmounts` TEXT NOT NULL,
    `allowOtherAmount` BOOLEAN NOT NULL DEFAULT true,
    `otherAmountTitle` VARCHAR(191) NOT NULL DEFAULT 'Other',
    `shopifyProductId` VARCHAR(191) NULL,
    `shopifyVariantIds` TEXT NOT NULL,
    `isRecurringEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Donation` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `orderNumber` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `donorEmail` VARCHAR(191) NULL,
    `donorName` VARCHAR(191) NULL,
    `message` VARCHAR(191) NULL,
    `shopifyProductId` VARCHAR(191) NULL,
    `shopifyVariantId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `isResent` BOOLEAN NOT NULL DEFAULT false,
    `receiptStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',

    UNIQUE INDEX `Donation_orderId_shopifyVariantId_key`(`orderId`, `shopifyVariantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlockConfig` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `productBlockEnabled` BOOLEAN NOT NULL DEFAULT true,
    `cartBlockEnabled` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `BlockConfig_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PosDonationLog` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NULL,
    `donationAmount` DOUBLE NOT NULL,
    `orderTotal` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `receiptStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `receiptSentAt` DATETIME(3) NULL,
    `isResent` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(191) NOT NULL DEFAULT 'pos',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PosDonationLog_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailSettings` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `contactEmail` VARCHAR(191) NOT NULL DEFAULT 'donations@yourstore.com',
    `ccEmail` VARCHAR(191) NULL DEFAULT '',
    `receiptSubject` VARCHAR(191) NOT NULL DEFAULT 'Thank you for your donation',
    `receiptBody` TEXT NULL,
    `refundSubject` VARCHAR(191) NOT NULL DEFAULT 'Donation Refund Confirmation',
    `refundBody` TEXT NULL,
    `cancelSubject` VARCHAR(191) NOT NULL DEFAULT 'Donation Cancellation',
    `cancelBody` TEXT NULL,
    `pauseSubject` VARCHAR(191) NOT NULL DEFAULT 'Subscription Paused',
    `pauseBody` TEXT NULL,
    `resumeSubject` VARCHAR(191) NOT NULL DEFAULT 'Subscription Resumed',
    `resumeBody` TEXT NULL,
    `logoUrl` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `reminderBody` TEXT NULL,
    `reminderSubject` VARCHAR(191) NOT NULL DEFAULT 'Upcoming Donation Reminder: {{amount}}',
    `notifyMerchantOnSubscriptionChange` BOOLEAN NOT NULL DEFAULT false,
    `recoveryBody` TEXT NULL,
    `recoverySubject` VARCHAR(191) NOT NULL DEFAULT 'Action Required: Your donation payment failed',

    UNIQUE INDEX `EmailSettings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `plan` VARCHAR(191) NOT NULL DEFAULT 'basic',
    `subscriptionId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pendingPlan` VARCHAR(191) NULL,

    UNIQUE INDEX `PlanSubscription_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurringDonationConfig` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL DEFAULT '9957801099511',
    `productGid` VARCHAR(191) NOT NULL DEFAULT 'gid://shopify/Product/9957801099511',
    `sellingPlanGroupId` VARCHAR(191) NULL,
    `monthlyPlanId` VARCHAR(191) NULL,
    `weeklyPlanId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RecurringDonationConfig_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppSettings` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `widgetTitle` VARCHAR(191) NOT NULL DEFAULT 'Donation',
    `buttonText` VARCHAR(191) NOT NULL DEFAULT 'Donate',
    `additionalCss` VARCHAR(191) NOT NULL DEFAULT '',
    `displayThankYou` BOOLEAN NOT NULL DEFAULT true,
    `thankYouMessage` VARCHAR(191) NOT NULL DEFAULT 'Thanks for Donating!!!!!!!',
    `sendReceipt` BOOLEAN NOT NULL DEFAULT true,
    `receiveReceipt` BOOLEAN NOT NULL DEFAULT true,
    `contactEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `ccEmail` VARCHAR(191) NOT NULL DEFAULT '',
    `subjectLine` VARCHAR(191) NOT NULL DEFAULT 'Donation Receipt',
    `emailTemplate` VARCHAR(191) NOT NULL DEFAULT '',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `showOnEmptyCart` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `AppSettings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurringDonationLog` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NULL,
    `donationAmount` DOUBLE NOT NULL,
    `orderTotal` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `receiptStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `receiptSentAt` DATETIME(3) NULL,
    `sellingPlanId` VARCHAR(191) NULL,
    `subscriptionContractId` VARCHAR(191) NULL,
    `frequency` VARCHAR(191) NOT NULL DEFAULT 'one_time',
    `isResent` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(191) NOT NULL DEFAULT 'recurring',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RecurringDonationLog_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoundUpDonationSettings` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `campaignTitle` VARCHAR(191) NOT NULL DEFAULT 'Donation for better society',
    `description` TEXT NOT NULL,
    `showImage` BOOLEAN NOT NULL DEFAULT true,
    `checkboxLabel` VARCHAR(191) NOT NULL DEFAULT 'Yes, I want to donate (amount)',
    `rounding` VARCHAR(191) NOT NULL DEFAULT 'nearest1',
    `donationOrderTag` VARCHAR(191) NOT NULL DEFAULT 'roundUpDonation',
    `customAmount` VARCHAR(191) NULL,
    `imageUrl` LONGTEXT NULL,
    `additionalDonationEnabled` BOOLEAN NOT NULL DEFAULT false,
    `additionalDonationTitle` VARCHAR(191) NOT NULL DEFAULT 'Add an extra donation (optional)',
    `placeholderText` VARCHAR(191) NOT NULL DEFAULT 'Enter amount',
    `buttonText` VARCHAR(191) NOT NULL DEFAULT 'Donate',
    `productId` VARCHAR(191) NULL,
    `productHandle` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RoundUpDonationSettings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoundUpDonationLog` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderNumber` VARCHAR(191) NULL,
    `donationAmount` DOUBLE NOT NULL,
    `orderTotal` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `receiptStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `receiptSentAt` DATETIME(3) NULL,
    `isResent` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(191) NOT NULL DEFAULT 'roundup',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RoundUpDonationLog_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `nextBillingDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastReminderDate` DATETIME(3) NULL,
    `reminderSentForDate` DATETIME(3) NULL,

    UNIQUE INDEX `subscription_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `orderName` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `interval` VARCHAR(191) NOT NULL DEFAULT 'Monthly',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `subscriptionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentRecoverySettings` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `retryAttempts` INTEGER NOT NULL DEFAULT 3,
    `retryInterval` INTEGER NOT NULL DEFAULT 3,
    `fallbackAction` VARCHAR(191) NOT NULL DEFAULT 'skip',
    `sendNotifications` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentRecoverySettings_shop_key`(`shop`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentRecoveryLog` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `subscriptionContractId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `orderNumber` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `maxRetries` INTEGER NOT NULL DEFAULT 3,
    `retryInterval` INTEGER NOT NULL DEFAULT 3,
    `nextRetryDate` DATETIME(3) NULL,
    `fallbackAction` VARCHAR(191) NOT NULL DEFAULT 'skip',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `donationName` VARCHAR(191) NULL,
    `frequency` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PaymentRecoveryLog_status_nextRetryDate_idx`(`status`, `nextRetryDate`),
    UNIQUE INDEX `PaymentRecoveryLog_shop_subscriptionContractId_key`(`shop`, `subscriptionContractId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BillingAttemptLog` (
    `id` VARCHAR(191) NOT NULL,
    `shop` VARCHAR(191) NOT NULL,
    `subscriptionContractId` VARCHAR(191) NOT NULL,
    `billingCycleIndex` INTEGER NULL,
    `billingAttemptId` VARCHAR(191) NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'webhook',
    `status` VARCHAR(191) NOT NULL DEFAULT 'failed',
    `errorCode` VARCHAR(191) NULL,
    `errorMessage` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `orderNumber` VARCHAR(191) NULL,
    `customerEmail` VARCHAR(191) NULL,
    `customerName` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `donationName` VARCHAR(191) NULL,
    `frequency` VARCHAR(191) NULL,
    `retryNumber` INTEGER NOT NULL DEFAULT 0,
    `idempotencyKey` VARCHAR(191) NULL,
    `rawPayload` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BillingAttemptLog_billingAttemptId_key`(`billingAttemptId`),
    INDEX `BillingAttemptLog_shop_subscriptionContractId_idx`(`shop`, `subscriptionContractId`),
    INDEX `BillingAttemptLog_shop_status_idx`(`shop`, `status`),
    INDEX `BillingAttemptLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Donation` ADD CONSTRAINT `Donation_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `Campaign`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
