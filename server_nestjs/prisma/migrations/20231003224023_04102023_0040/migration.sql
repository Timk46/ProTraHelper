/*
  Warnings:

  - A unique constraint covering the columns `[id]` on the table `anonymousUser` will be added. If there are existing duplicate values, this will fail.
  - Made the column `userId` on table `anonymousUser` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `anonymousUser` DROP FOREIGN KEY `anonymousUser_userId_fkey`;

-- AlterTable
ALTER TABLE `anonymousUser` MODIFY `userId` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `anonymousUser_id_key` ON `anonymousUser`(`id`);

-- AddForeignKey
ALTER TABLE `anonymousUser` ADD CONSTRAINT `anonymousUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
