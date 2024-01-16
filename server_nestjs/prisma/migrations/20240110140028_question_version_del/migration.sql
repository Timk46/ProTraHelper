/*
  Warnings:

  - Added the required column `questionId` to the `MCQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `MCQuestion` DROP FOREIGN KEY `MCQuestion_questionVersionId_fkey`;

-- AlterTable
ALTER TABLE `MCQuestion` ADD COLUMN `questionId` INTEGER NOT NULL,
    MODIFY `questionVersionId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Question` ADD COLUMN `isApproved` BOOLEAN NULL,
    ADD COLUMN `version` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `MCQuestion` ADD CONSTRAINT `MCQuestion_questionVersionId_fkey` FOREIGN KEY (`questionVersionId`) REFERENCES `QuestionVersion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MCQuestion` ADD CONSTRAINT `MCQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
