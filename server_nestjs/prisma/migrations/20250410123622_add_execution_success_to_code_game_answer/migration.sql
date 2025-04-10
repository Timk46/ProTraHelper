/*
  Warnings:

  - Made the column `codeGameExecutionResult` on table `CodeGameAnswer` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CodeGameAnswer" ADD COLUMN     "executionSuccess" BOOLEAN,
ALTER COLUMN "codeGameExecutionResult" SET NOT NULL;
