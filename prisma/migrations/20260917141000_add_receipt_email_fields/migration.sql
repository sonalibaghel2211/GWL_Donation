ALTER TABLE `EmailSettings`
ADD COLUMN `receiptAcknowledgementText` TEXT NULL,
ADD COLUMN `receiptFooterNote` TEXT NULL,
ADD COLUMN `receiptCancelAcknowledgementText` TEXT NULL;
