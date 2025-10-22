/*
  Warnings:

  - Added the required column `groupReviewGateId` to the `evaluation_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "evaluation_sessions" ADD COLUMN     "groupReviewGateId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "evaluation_sessions" ADD CONSTRAINT "evaluation_sessions_groupReviewGateId_fkey" FOREIGN KEY ("groupReviewGateId") REFERENCES "GroupReviewGate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
