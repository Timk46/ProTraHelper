-- DropForeignKey
ALTER TABLE `Feedback` DROP FOREIGN KEY `Feedback_userAnswerId_fkey`;

-- DropForeignKey
ALTER TABLE `MCQuestion` DROP FOREIGN KEY `MCQuestion_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `MCQuestionOption` DROP FOREIGN KEY `MCQuestionOption_mcOptionId_fkey`;

-- DropForeignKey
ALTER TABLE `MCQuestionOption` DROP FOREIGN KEY `MCQuestionOption_mcQuestionId_fkey`;

-- DropForeignKey
ALTER TABLE `Message` DROP FOREIGN KEY `Message_discussionId_fkey`;

-- DropForeignKey
ALTER TABLE `ModuleConceptGoal` DROP FOREIGN KEY `ModuleConceptGoal_conceptNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `ModuleConceptGoal` DROP FOREIGN KEY `ModuleConceptGoal_moduleId_fkey`;

-- DropForeignKey
ALTER TABLE `Question` DROP FOREIGN KEY `Question_originId_fkey`;

-- DropForeignKey
ALTER TABLE `QuestionVersion` DROP FOREIGN KEY `QuestionVersion_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `UserAnswer` DROP FOREIGN KEY `UserAnswer_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `UserContentElementProgress` DROP FOREIGN KEY `UserContentElementProgress_contentElementId_fkey`;

-- DropForeignKey
ALTER TABLE `UserContentElementProgress` DROP FOREIGN KEY `UserContentElementProgress_userId_fkey`;

-- DropForeignKey
ALTER TABLE `UserMCOptionSelected` DROP FOREIGN KEY `UserMCOptionSelected_mcOptionId_fkey`;

-- DropForeignKey
ALTER TABLE `UserMCOptionSelected` DROP FOREIGN KEY `UserMCOptionSelected_userAnswerId_fkey`;

-- DropForeignKey
ALTER TABLE `Vote` DROP FOREIGN KEY `Vote_messageId_fkey`;

-- DropForeignKey
ALTER TABLE `Vote` DROP FOREIGN KEY `Vote_userId_fkey`;

-- DropForeignKey
ALTER TABLE `anonymousUser` DROP FOREIGN KEY `anonymousUser_userId_fkey`;

-- AlterTable
ALTER TABLE `Feedback` MODIFY `text` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `UserContentView` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `contentNodeId` INTEGER NOT NULL,
    `lastOpened` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ModuleConceptGoal` ADD CONSTRAINT `ModuleConceptGoal_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModuleConceptGoal` ADD CONSTRAINT `ModuleConceptGoal_conceptNodeId_fkey` FOREIGN KEY (`conceptNodeId`) REFERENCES `ConceptNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_userAnswerId_fkey` FOREIGN KEY (`userAnswerId`) REFERENCES `UserAnswer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Question` ADD CONSTRAINT `Question_originId_fkey` FOREIGN KEY (`originId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuestionVersion` ADD CONSTRAINT `QuestionVersion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MCQuestion` ADD CONSTRAINT `MCQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MCQuestionOption` ADD CONSTRAINT `MCQuestionOption_mcQuestionId_fkey` FOREIGN KEY (`mcQuestionId`) REFERENCES `MCQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MCQuestionOption` ADD CONSTRAINT `MCQuestionOption_mcOptionId_fkey` FOREIGN KEY (`mcOptionId`) REFERENCES `MCOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserAnswer` ADD CONSTRAINT `UserAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMCOptionSelected` ADD CONSTRAINT `UserMCOptionSelected_userAnswerId_fkey` FOREIGN KEY (`userAnswerId`) REFERENCES `UserAnswer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMCOptionSelected` ADD CONSTRAINT `UserMCOptionSelected_mcOptionId_fkey` FOREIGN KEY (`mcOptionId`) REFERENCES `MCOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anonymousUser` ADD CONSTRAINT `anonymousUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_discussionId_fkey` FOREIGN KEY (`discussionId`) REFERENCES `Discussion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserContentElementProgress` ADD CONSTRAINT `UserContentElementProgress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserContentElementProgress` ADD CONSTRAINT `UserContentElementProgress_contentElementId_fkey` FOREIGN KEY (`contentElementId`) REFERENCES `ContentElement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserContentView` ADD CONSTRAINT `UserContentView_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserContentView` ADD CONSTRAINT `UserContentView_contentNodeId_fkey` FOREIGN KEY (`contentNodeId`) REFERENCES `ContentNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
