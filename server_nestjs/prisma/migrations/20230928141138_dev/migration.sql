/*
  Warnings:

  - Made the column `discussionId` on table `Message` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Message` DROP FOREIGN KEY `Message_discussionId_fkey`;

-- AlterTable
ALTER TABLE `Message` ADD COLUMN `isInitiator` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `discussionId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `Vote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isUpvote` BOOLEAN NOT NULL DEFAULT false,
    `userId` INTEGER NOT NULL,
    `messageId` INTEGER NOT NULL,

    UNIQUE INDEX `Vote_userId_key`(`userId`),
    UNIQUE INDEX `Vote_messageId_key`(`messageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_discussionId_fkey` FOREIGN KEY (`discussionId`) REFERENCES `Discussion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
