/*
  Warnings:

  - You are about to drop the column `successorId` on the `Question` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[originId]` on the table `Question` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Question` DROP FOREIGN KEY `Question_successorId_fkey`;

-- AlterTable
ALTER TABLE `Question` DROP COLUMN `successorId`,
    ADD COLUMN `originId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Question_originId_key` ON `Question`(`originId`);

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_originId_fkey` FOREIGN KEY (`originId`) REFERENCES `Question`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
