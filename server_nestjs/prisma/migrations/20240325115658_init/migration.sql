/*
  Warnings:

  - You are about to drop the column `contentElementId` on the `Question` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "contentElementType" ADD VALUE 'QUESTION';

-- AlterTable
ALTER TABLE "ContentView" ALTER COLUMN "position" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "contentElementId";
