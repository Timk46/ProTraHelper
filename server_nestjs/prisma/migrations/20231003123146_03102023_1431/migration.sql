/*
  Warnings:

  - You are about to drop the column `voteId` on the `Message` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[messageId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `messageId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Message` DROP FOREIGN KEY `Message_voteId_fkey`;

-- AlterTable
ALTER TABLE `Message` DROP COLUMN `voteId`;

-- AlterTable
ALTER TABLE `Vote` ADD COLUMN `messageId` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Vote_messageId_key` ON `Vote`(`messageId`);

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
