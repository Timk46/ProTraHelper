/*
  Warnings:

  - You are about to drop the column `messageId` on the `Vote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[voteId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `voteId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Vote` DROP FOREIGN KEY `Vote_messageId_fkey`;

-- AlterTable
ALTER TABLE `Message` ADD COLUMN `voteId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Vote` DROP COLUMN `messageId`;

-- CreateIndex
CREATE UNIQUE INDEX `Message_voteId_key` ON `Message`(`voteId`);

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_voteId_fkey` FOREIGN KEY (`voteId`) REFERENCES `Vote`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
