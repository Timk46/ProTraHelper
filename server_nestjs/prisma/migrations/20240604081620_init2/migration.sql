/*
  Warnings:

  - Added the required column `questionId` to the `UmlQuestion` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UmlQuestion" ADD COLUMN     "questionId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "UmlQuestion" ADD CONSTRAINT "UmlQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
