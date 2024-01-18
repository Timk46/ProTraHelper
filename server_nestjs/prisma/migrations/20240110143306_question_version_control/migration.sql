/*
  Warnings:

  - A unique constraint covering the columns `[successorId]` on the table `Question` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Question` ADD COLUMN `successorId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Question_successorId_key` ON `Question`(`successorId`);

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_successorId_fkey` FOREIGN KEY (`successorId`) REFERENCES `Question`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
