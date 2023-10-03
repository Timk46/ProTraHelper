-- DropForeignKey
ALTER TABLE `anonymousUser` DROP FOREIGN KEY `anonymousUser_userId_fkey`;

-- AlterTable
ALTER TABLE `anonymousUser` MODIFY `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `anonymousUser` ADD CONSTRAINT `anonymousUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
