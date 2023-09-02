-- DropForeignKey
ALTER TABLE `Requirement` DROP FOREIGN KEY `Requirement_conceptNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `Requirement` DROP FOREIGN KEY `Requirement_contentNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `Training` DROP FOREIGN KEY `Training_conceptNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `Training` DROP FOREIGN KEY `Training_contentNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `UserConcept` DROP FOREIGN KEY `UserConcept_conceptNodeId_fkey`;

-- DropForeignKey
ALTER TABLE `UserConcept` DROP FOREIGN KEY `UserConcept_userId_fkey`;

-- AddForeignKey
ALTER TABLE `Requirement` ADD CONSTRAINT `Requirement_contentNodeId_fkey` FOREIGN KEY (`contentNodeId`) REFERENCES `ContentNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Requirement` ADD CONSTRAINT `Requirement_conceptNodeId_fkey` FOREIGN KEY (`conceptNodeId`) REFERENCES `ConceptNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Training` ADD CONSTRAINT `Training_contentNodeId_fkey` FOREIGN KEY (`contentNodeId`) REFERENCES `ContentNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Training` ADD CONSTRAINT `Training_conceptNodeId_fkey` FOREIGN KEY (`conceptNodeId`) REFERENCES `ConceptNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserConcept` ADD CONSTRAINT `UserConcept_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserConcept` ADD CONSTRAINT `UserConcept_conceptNodeId_fkey` FOREIGN KEY (`conceptNodeId`) REFERENCES `ConceptNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
