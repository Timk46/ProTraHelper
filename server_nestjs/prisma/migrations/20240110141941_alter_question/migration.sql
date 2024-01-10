/*
  Warnings:

  - Made the column `isApproved` on table `Question` required. This step will fail if there are existing NULL values in that column.
  - Made the column `version` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Question` MODIFY `isApproved` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `version` INTEGER NOT NULL DEFAULT 1;
