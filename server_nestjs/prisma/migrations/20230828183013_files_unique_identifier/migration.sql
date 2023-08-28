/*
  Warnings:

  - A unique constraint covering the columns `[uniqueIdentifier]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uniqueIdentifier` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `File` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `uniqueIdentifier` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `File_uniqueIdentifier_key` ON `File`(`uniqueIdentifier`);
