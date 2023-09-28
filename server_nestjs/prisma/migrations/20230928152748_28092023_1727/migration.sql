/*
  Warnings:

  - You are about to drop the column `discussionId` on the `anonymousUser` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Discussion` DROP FOREIGN KEY `Discussion_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `Message` DROP FOREIGN KEY `Message_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `Vote` DROP FOREIGN KEY `Vote_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `anonymousUser` DROP FOREIGN KEY `anonymousUser_discussionId_fkey`;

-- AlterTable
ALTER TABLE `anonymousUser` DROP COLUMN `discussionId`;

-- AddForeignKey
ALTER TABLE `Discussion` ADD CONSTRAINT `Discussion_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `anonymousUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `anonymousUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `anonymousUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
