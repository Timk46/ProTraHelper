-- AlterTable
ALTER TABLE "CodingQuestion" ADD COLUMN     "expectations" TEXT;

-- CreateTable
CREATE TABLE "ModelSolution" (
    "id" SERIAL NOT NULL,
    "codingQuestionId" INTEGER NOT NULL,
    "codeFileName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT,

    CONSTRAINT "ModelSolution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ModelSolution" ADD CONSTRAINT "ModelSolution_codingQuestionId_fkey" FOREIGN KEY ("codingQuestionId") REFERENCES "CodingQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
