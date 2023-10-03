/*
  Warnings:

  - Added the required column `conceptNodeId` to the `Discussion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Discussion` ADD COLUMN `conceptNodeId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `Discussion` ADD CONSTRAINT `Discussion_conceptNodeId_fkey` FOREIGN KEY (`conceptNodeId`) REFERENCES `ConceptNode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
