/*
  Warnings:

  - You are about to drop the `Modul` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ModulToSubject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_ModulToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_ModulToSubject` DROP FOREIGN KEY `_ModulToSubject_A_fkey`;

-- DropForeignKey
ALTER TABLE `_ModulToSubject` DROP FOREIGN KEY `_ModulToSubject_B_fkey`;

-- DropForeignKey
ALTER TABLE `_ModulToUser` DROP FOREIGN KEY `_ModulToUser_A_fkey`;

-- DropForeignKey
ALTER TABLE `_ModulToUser` DROP FOREIGN KEY `_ModulToUser_B_fkey`;

-- DropTable
DROP TABLE `Modul`;

-- DropTable
DROP TABLE `_ModulToSubject`;

-- DropTable
DROP TABLE `_ModulToUser`;

-- CreateTable
CREATE TABLE `Module` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Module_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModuleConceptGoal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `moduleId` INTEGER NOT NULL,
    `conceptNodeId` INTEGER NOT NULL,
    `level` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ModuleToSubject` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ModuleToSubject_AB_unique`(`A`, `B`),
    INDEX `_ModuleToSubject_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_ModuleToUser` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_ModuleToUser_AB_unique`(`A`, `B`),
    INDEX `_ModuleToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ModuleConceptGoal` ADD CONSTRAINT `ModuleConceptGoal_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `Module`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ModuleConceptGoal` ADD CONSTRAINT `ModuleConceptGoal_conceptNodeId_fkey` FOREIGN KEY (`conceptNodeId`) REFERENCES `ConceptNode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ModuleToSubject` ADD CONSTRAINT `_ModuleToSubject_A_fkey` FOREIGN KEY (`A`) REFERENCES `Module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ModuleToSubject` ADD CONSTRAINT `_ModuleToSubject_B_fkey` FOREIGN KEY (`B`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ModuleToUser` ADD CONSTRAINT `_ModuleToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `Module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_ModuleToUser` ADD CONSTRAINT `_ModuleToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
