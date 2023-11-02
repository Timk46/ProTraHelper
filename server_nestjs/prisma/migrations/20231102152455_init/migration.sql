/*
  Warnings:

  - You are about to drop the column `authorId` on the `vote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,messageId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `vote` DROP FOREIGN KEY `Vote_authorId_fkey`;

-- DropIndex
DROP INDEX `Vote_authorId_messageId_key` ON `vote`;

-- AlterTable
ALTER TABLE `vote` DROP COLUMN `authorId`,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Vote_userId_messageId_key` ON `Vote`(`userId`, `messageId`);

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
