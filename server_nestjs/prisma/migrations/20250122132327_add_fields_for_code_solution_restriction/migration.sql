-- AlterTable
ALTER TABLE "CodeGameQuestion" ADD COLUMN     "codeSolutionRestriction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "frequencyOfMethodNameToRestrict" INTEGER,
ADD COLUMN     "methodNameToRestrict" TEXT;
