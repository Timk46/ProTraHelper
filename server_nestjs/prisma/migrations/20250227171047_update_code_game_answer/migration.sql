/*
  Warnings:

  - Added the required column `allRocksCollected` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `allWhiteListCellsVisited` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codeGameExecutionResult` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `collectedRocks` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequencyOfMethodCallsResult` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `frequencyOfMethodEvaluationResult` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reachedDestination` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalRocks` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visitedCellsAreAllowed` to the `CodeGameAnswer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CodeGameAnswer" ADD COLUMN     "allRocksCollected" BOOLEAN NOT NULL,
ADD COLUMN     "allWhiteListCellsVisited" BOOLEAN NOT NULL,
ADD COLUMN     "codeGameExecutionResult" TEXT NOT NULL,
ADD COLUMN     "collectedRocks" INTEGER NOT NULL,
ADD COLUMN     "frequencyOfMethodCallsResult" INTEGER NOT NULL,
ADD COLUMN     "frequencyOfMethodEvaluationResult" BOOLEAN NOT NULL,
ADD COLUMN     "reachedDestination" BOOLEAN NOT NULL,
ADD COLUMN     "totalRocks" INTEGER NOT NULL,
ADD COLUMN     "visitedCellsAreAllowed" BOOLEAN NOT NULL;
