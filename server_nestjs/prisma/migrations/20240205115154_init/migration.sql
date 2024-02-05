/*
  Warnings:

  - Made the column `text` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Question` MODIFY `text` TEXT NOT NULL;
