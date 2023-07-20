/*
  Warnings:

  - You are about to drop the column `media` on the `mcanswer` table. All the data in the column will be lost.
  - You are about to drop the column `media` on the `question` table. All the data in the column will be lost.
  - You are about to drop the `media` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[questionId]` on the table `CodingQuestion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[questionId]` on the table `MCQuestion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `MCAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `MCQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `mcanswer` DROP COLUMN `media`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `mcquestion` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `question` DROP COLUMN `media`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- DropTable
DROP TABLE `media`;

-- CreateTable
CREATE TABLE `File` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `questionId` INTEGER NOT NULL,
    `mCAnswerId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CodeGeruest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` VARCHAR(191) NOT NULL,
    `codingQuestionId` INTEGER NOT NULL,
    `codeFileName` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutomatedTest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `testFileName` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL,
    `questionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Testcase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `input` VARCHAR(191) NOT NULL,
    `expectedOutput` VARCHAR(191) NOT NULL,
    `automatedTestId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubmissionCode` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `compilerOutput` VARCHAR(191) NOT NULL,
    `compilerError` VARCHAR(191) NOT NULL,
    `compilerResponse` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubmissionSingleCodeFile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `code` VARCHAR(191) NULL,
    `language` VARCHAR(191) NULL,
    `codeFileName` VARCHAR(191) NULL,
    `userId` INTEGER NOT NULL,
    `submissionCodeId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KIFeedback` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `model` VARCHAR(191) NOT NULL,
    `text` VARCHAR(191) NOT NULL,
    `ratedByStudent` INTEGER NOT NULL,
    `submissionId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `CodingQuestion_questionId_key` ON `CodingQuestion`(`questionId`);

-- CreateIndex
CREATE UNIQUE INDEX `MCQuestion_questionId_key` ON `MCQuestion`(`questionId`);

-- AddForeignKey
ALTER TABLE `File` ADD CONSTRAINT `File_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `File` ADD CONSTRAINT `File_mCAnswerId_fkey` FOREIGN KEY (`mCAnswerId`) REFERENCES `MCAnswer`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CodeGeruest` ADD CONSTRAINT `CodeGeruest_codingQuestionId_fkey` FOREIGN KEY (`codingQuestionId`) REFERENCES `CodingQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutomatedTest` ADD CONSTRAINT `AutomatedTest_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `CodingQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Testcase` ADD CONSTRAINT `Testcase_automatedTestId_fkey` FOREIGN KEY (`automatedTestId`) REFERENCES `AutomatedTest`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmissionCode` ADD CONSTRAINT `SubmissionCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmissionSingleCodeFile` ADD CONSTRAINT `SubmissionSingleCodeFile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubmissionSingleCodeFile` ADD CONSTRAINT `SubmissionSingleCodeFile_submissionCodeId_fkey` FOREIGN KEY (`submissionCodeId`) REFERENCES `SubmissionCode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KIFeedback` ADD CONSTRAINT `KIFeedback_submissionId_fkey` FOREIGN KEY (`submissionId`) REFERENCES `SubmissionCode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
