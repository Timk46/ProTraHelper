/*
  Warnings:

  - You are about to drop the column `text` on the `CodeGeruest` table. All the data in the column will be lost.
  - You are about to drop the column `ratedByStudent` on the `KIFeedback` table. All the data in the column will be lost.
  - You are about to drop the `MCAnswer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubmissionCode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubmissionSingleCodeFile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[authorId]` on the table `Discussion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `mainFileName` to the `CodingQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `CodingQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `textHTML` to the `CodingQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conceptNodeId` to the `Discussion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `KIFeedback` table without a default value. This is not possible if the table is not empty.
  - Made the column `discussionId` on table `Message` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `AutomatedTest` DROP FOREIGN KEY `AutomatedTest_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `CodeGeruest` DROP FOREIGN KEY `CodeGeruest_codingQuestionId_fkey`;

-- DropForeignKey
ALTER TABLE `CodingQuestion` DROP FOREIGN KEY `CodingQuestion_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `Discussion` DROP FOREIGN KEY `Discussion_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `Discussion` DROP FOREIGN KEY `Discussion_contentNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `File` DROP FOREIGN KEY `File_mCAnswerId_fkey`;

-- DropForeignKey
ALTER TABLE `KIFeedback` DROP FOREIGN KEY `KIFeedback_submissionId_fkey`;

-- DropForeignKey
ALTER TABLE `MCAnswer` DROP FOREIGN KEY `MCAnswer_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `Message` DROP FOREIGN KEY `Message_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `Message` DROP FOREIGN KEY `Message_discussionId_fkey`;

-- DropForeignKey
ALTER TABLE `SubmissionCode` DROP FOREIGN KEY `SubmissionCode_userId_fkey`;

-- DropForeignKey
ALTER TABLE `SubmissionSingleCodeFile` DROP FOREIGN KEY `SubmissionSingleCodeFile_submissionCodeId_fkey`;

-- DropForeignKey
ALTER TABLE `SubmissionSingleCodeFile` DROP FOREIGN KEY `SubmissionSingleCodeFile_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Testcase` DROP FOREIGN KEY `Testcase_automatedTestId_fkey`;

-- AlterTable
ALTER TABLE `AutomatedTest` MODIFY `code` TEXT NOT NULL,
    MODIFY `testFileName` VARCHAR(191) NULL,
    MODIFY `language` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CodeGeruest` DROP COLUMN `text`,
    MODIFY `code` TEXT NOT NULL,
    MODIFY `language` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `CodingQuestion` ADD COLUMN `mainFileName` VARCHAR(191) NOT NULL,
    ADD COLUMN `text` TEXT NOT NULL,
    ADD COLUMN `textHTML` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Discussion` ADD COLUMN `conceptNodeId` INTEGER NOT NULL,
    ADD COLUMN `isSolved` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `contentNodeId` INTEGER NULL;

-- AlterTable
ALTER TABLE `KIFeedback` DROP COLUMN `ratedByStudent`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `feedbackByStudent` TEXT NULL,
    ADD COLUMN `ratingByStudent` INTEGER NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `text` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `MCQuestion` ADD COLUMN `shuffleoptions` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `Message` ADD COLUMN `isInitiator` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `isSolution` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `text` VARCHAR(2000) NOT NULL,
    MODIFY `discussionId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Question` ADD COLUMN `text` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `MCAnswer`;

-- DropTable
DROP TABLE `SubmissionCode`;

-- DropTable
DROP TABLE `SubmissionSingleCodeFile`;

-- CreateTable
CREATE TABLE `MCOption` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `is_correct` BOOLEAN NOT NULL,
    `questionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserMCAnswer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserMCAnswerSelected` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userMCAnswerId` INTEGER NOT NULL,
    `answerId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CodeSubmission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `compilerOutput` TEXT NULL,
    `compilerError` TEXT NULL,
    `compilerResponse` TEXT NULL,
    `userId` INTEGER NOT NULL,
    `codingQuestionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CodeSubmissionFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `version` INTEGER NOT NULL,
    `code` TEXT NULL,
    `language` VARCHAR(191) NULL,
    `codeFileName` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `CodeSubmissionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anonymousUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `anonymousName` VARCHAR(191) NOT NULL DEFAULT 'Anonymchen',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isUpvote` BOOLEAN NOT NULL DEFAULT true,
    `authorId` INTEGER NOT NULL,
    `messageId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Discussion_authorId_key` ON `Discussion`(`authorId`);

-- AddForeignKey
ALTER TABLE `File` ADD CONSTRAINT `File_mCAnswerId_fkey` FOREIGN KEY (`mCAnswerId`) REFERENCES `MCOption`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MCOption` ADD CONSTRAINT `MCOption_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `MCQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMCAnswer` ADD CONSTRAINT `UserMCAnswer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMCAnswer` ADD CONSTRAINT `UserMCAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `MCQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMCAnswerSelected` ADD CONSTRAINT `UserMCAnswerSelected_userMCAnswerId_fkey` FOREIGN KEY (`userMCAnswerId`) REFERENCES `UserMCAnswer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserMCAnswerSelected` ADD CONSTRAINT `UserMCAnswerSelected_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `MCOption`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodingQuestion` ADD CONSTRAINT `CodingQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeGeruest` ADD CONSTRAINT `CodeGeruest_codingQuestionId_fkey` FOREIGN KEY (`codingQuestionId`) REFERENCES `CodingQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomatedTest` ADD CONSTRAINT `AutomatedTest_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `CodingQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Testcase` ADD CONSTRAINT `Testcase_automatedTestId_fkey` FOREIGN KEY (`automatedTestId`) REFERENCES `AutomatedTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeSubmission` ADD CONSTRAINT `CodeSubmission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeSubmission` ADD CONSTRAINT `CodeSubmission_codingQuestionId_fkey` FOREIGN KEY (`codingQuestionId`) REFERENCES `CodingQuestion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeSubmissionFile` ADD CONSTRAINT `CodeSubmissionFile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeSubmissionFile` ADD CONSTRAINT `CodeSubmissionFile_CodeSubmissionId_fkey` FOREIGN KEY (`CodeSubmissionId`) REFERENCES `CodeSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KIFeedback` ADD CONSTRAINT `KIFeedback_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `CodeSubmission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anonymousUser` ADD CONSTRAINT `anonymousUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Discussion` ADD CONSTRAINT `Discussion_contentNodeId_fkey` FOREIGN KEY (`contentNodeId`) REFERENCES `ContentNode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Discussion` ADD CONSTRAINT `Discussion_conceptNodeId_fkey` FOREIGN KEY (`conceptNodeId`) REFERENCES `ConceptNode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Discussion` ADD CONSTRAINT `Discussion_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `anonymousUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `anonymousUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_discussionId_fkey` FOREIGN KEY (`discussionId`) REFERENCES `Discussion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `anonymousUser`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vote` ADD CONSTRAINT `Vote_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
