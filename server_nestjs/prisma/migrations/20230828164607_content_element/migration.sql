-- DropForeignKey
ALTER TABLE `ContentElement` DROP FOREIGN KEY `ContentElement_contentNodeId_fkey`;

-- AddForeignKey
ALTER TABLE `ContentElement` ADD CONSTRAINT `ContentElement_contentNodeId_fkey` FOREIGN KEY (`contentNodeId`) REFERENCES `ContentNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
