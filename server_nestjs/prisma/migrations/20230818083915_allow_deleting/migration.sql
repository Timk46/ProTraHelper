-- DropForeignKey
ALTER TABLE `ConceptFamily` DROP FOREIGN KEY `ConceptFamily_parentId_fkey`;

-- DropForeignKey
ALTER TABLE `ConceptGraph` DROP FOREIGN KEY `ConceptGraph_ancestorId_fkey`;

-- DropForeignKey
ALTER TABLE `ContentEdge` DROP FOREIGN KEY `ContentEdge_prerequisiteId_fkey`;

-- DropForeignKey
ALTER TABLE `ContentEdge` DROP FOREIGN KEY `ContentEdge_successorId_fkey`;

-- DropForeignKey
ALTER TABLE `User` DROP FOREIGN KEY `User_currentconceptNodeId_fkey`;

-- AlterTable
ALTER TABLE `User` MODIFY `currentconceptNodeId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_currentconceptNodeId_fkey` FOREIGN KEY (`currentconceptNodeId`) REFERENCES `ConceptNode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConceptGraph` ADD CONSTRAINT `ConceptGraph_ancestorId_fkey` FOREIGN KEY (`ancestorId`) REFERENCES `ConceptNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ConceptFamily` ADD CONSTRAINT `ConceptFamily_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `ConceptNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentEdge` ADD CONSTRAINT `ContentEdge_prerequisiteId_fkey` FOREIGN KEY (`prerequisiteId`) REFERENCES `ContentNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContentEdge` ADD CONSTRAINT `ContentEdge_successorId_fkey` FOREIGN KEY (`successorId`) REFERENCES `ContentNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
