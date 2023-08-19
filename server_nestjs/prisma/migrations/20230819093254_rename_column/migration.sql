/*
  Warnings:

  - You are about to drop the column `ancestorId` on the `ConceptGraph` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[rootId]` on the table `ConceptGraph` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `ConceptGraph` DROP FOREIGN KEY `ConceptGraph_ancestorId_fkey`;

-- AlterTable
ALTER TABLE `ConceptGraph` DROP COLUMN `ancestorId`,
    ADD COLUMN `rootId` INTEGER NULL;

-- AlterTable
ALTER TABLE `UserConcept` MODIFY `level` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ConceptGraph_rootId_key` ON `ConceptGraph`(`rootId`);

-- AddForeignKey
ALTER TABLE `ConceptGraph` ADD CONSTRAINT `ConceptGraph_rootId_fkey` FOREIGN KEY (`rootId`) REFERENCES `ConceptNode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
