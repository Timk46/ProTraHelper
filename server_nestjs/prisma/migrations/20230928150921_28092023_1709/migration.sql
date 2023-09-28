-- CreateTable
CREATE TABLE `anonymousUser` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `discussionId` INTEGER NOT NULL,
    `anonymousName` VARCHAR(191) NOT NULL DEFAULT 'Anonymchen',

    UNIQUE INDEX `anonymousUser_userId_key`(`userId`),
    UNIQUE INDEX `anonymousUser_discussionId_key`(`discussionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `anonymousUser` ADD CONSTRAINT `anonymousUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `anonymousUser` ADD CONSTRAINT `anonymousUser_discussionId_fkey` FOREIGN KEY (`discussionId`) REFERENCES `Discussion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
