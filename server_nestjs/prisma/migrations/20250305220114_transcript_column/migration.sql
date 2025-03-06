/*
  Warnings:

  - Changed the type of `type` on the `Question` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "questionType" AS ENUM ('SC', 'MC', 'FreeText', 'Fillin', 'CodingQuestion', 'GraphQuestion');

-- AlterTable
ALTER TABLE "ConceptNode" ADD COLUMN     "transcript" TEXT;

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "type",
ADD COLUMN     "type" "questionType" NOT NULL;
