-- AlterTable
ALTER TABLE `Discussion` ADD COLUMN `isSolved` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Message` ADD COLUMN `isSolution` BOOLEAN NOT NULL DEFAULT false;
