/*
  Warnings:

  - You are about to drop the column `contentNodeId` on the `Question` table. All the data in the column will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_RoleToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Question` DROP FOREIGN KEY `Question_contentNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `_RoleToUser` DROP FOREIGN KEY `_RoleToUser_A_fkey`;

-- DropForeignKey
ALTER TABLE `_RoleToUser` DROP FOREIGN KEY `_RoleToUser_B_fkey`;

-- AlterTable
ALTER TABLE `File` ADD COLUMN `contentElementId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Question` DROP COLUMN `contentNodeId`,
    ADD COLUMN `contentElementId` INTEGER NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `globalRole` ENUM('STUDENT', 'TEACHER', 'ADMIN') NOT NULL DEFAULT 'STUDENT';

-- DropTable
DROP TABLE `Role`;

-- DropTable
DROP TABLE `_RoleToUser`;

-- CreateTable
CREATE TABLE `ContentElement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'CODE', 'PDF') NOT NULL,
    `position` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `text` VARCHAR(191) NULL,
    `contentNodeId` INTEGER NOT NULL,
    `fileId` INTEGER NULL,
    `questionId` INTEGER NULL,

    UNIQUE INDEX `ContentElement_contentNodeId_key`(`contentNodeId`),
    UNIQUE INDEX `ContentElement_fileId_key`(`fileId`),
    UNIQUE INDEX `ContentElement_questionId_key`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContentElement` ADD CONSTRAINT `ContentElement_contentNodeId_fkey` FOREIGN KEY (`contentNodeId`) REFERENCES `ContentNode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentElement` ADD CONSTRAINT `ContentElement_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `File`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentElement` ADD CONSTRAINT `ContentElement_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
