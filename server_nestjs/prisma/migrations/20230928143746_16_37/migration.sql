/*
  Warnings:

  - You are about to drop the column `userId` on the `Vote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[authorId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `authorId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Vote` DROP FOREIGN KEY `Vote_userId_fkey`;

-- AlterTable
ALTER TABLE `Vote` DROP COLUMN `userId`,
    ADD COLUMN `authorId` INTEGER NOT NULL,
    MODIFY `isUpvote` BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX `Vote_authorId_key` ON `Vote`(`authorId`);

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
