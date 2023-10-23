-- AlterTable
ALTER TABLE `discussion` ADD COLUMN `contentElementId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Discussion` ADD CONSTRAINT `Discussion_contentElementId_fkey` FOREIGN KEY (`contentElementId`) REFERENCES `ContentElement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
