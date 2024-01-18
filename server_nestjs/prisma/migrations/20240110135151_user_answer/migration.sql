/*
  Warnings:

  - Added the required column `userAnswerId` to the `UserMCOptionSelected` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `UserMCOptionSelected` ADD COLUMN `userAnswerId` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `UserAnswer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,
    `feedbackId` INTEGER NOT NULL,
    `userFreetextAnswer` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserAnswer` ADD CONSTRAINT `UserAnswer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAnswer` ADD CONSTRAINT `UserAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAnswer` ADD CONSTRAINT `UserAnswer_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMCOptionSelected` ADD CONSTRAINT `UserMCOptionSelected_userAnswerId_fkey` FOREIGN KEY (`userAnswerId`) REFERENCES `UserAnswer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
