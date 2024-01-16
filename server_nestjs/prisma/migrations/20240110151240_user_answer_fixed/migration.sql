/*
  Warnings:

  - You are about to drop the column `userMCAnswerId` on the `UserMCOptionSelected` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `UserMCOptionSelected` DROP FOREIGN KEY `UserMCOptionSelected_userMCAnswerId_fkey`;

-- AlterTable
ALTER TABLE `UserMCOptionSelected` DROP COLUMN `userMCAnswerId`;
