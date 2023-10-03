-- DropForeignKey
ALTER TABLE `Discussion` DROP FOREIGN KEY `Discussion_contentNodeId_fkey`;

-- AlterTable
ALTER TABLE `Discussion` MODIFY `contentNodeId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Discussion` ADD CONSTRAINT `Discussion_contentNodeId_fkey` FOREIGN KEY (`contentNodeId`) REFERENCES `ContentNode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
