/*
  Warnings:

  - Added the required column `codeSolutionRestriction` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CodeGameAnswer" ADD COLUMN     "codeSolutionRestriction" BOOLEAN NOT NULL;
