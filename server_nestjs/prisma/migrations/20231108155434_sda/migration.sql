-- DropForeignKey
ALTER TABLE `ChatBotMessage` DROP FOREIGN KEY `ChatBotMessage_userId_fkey`;

-- AlterTable
ALTER TABLE `ChatBotMessage` ADD COLUMN `isBot` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `userId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `ChatBotMessage` ADD CONSTRAINT `ChatBotMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
