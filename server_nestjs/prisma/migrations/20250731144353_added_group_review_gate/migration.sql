-- CreateTable
CREATE TABLE "GroupReviewGate" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "linkedQuestionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GroupReviewGate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupReviewGate_questionId_key" ON "GroupReviewGate"("questionId");

-- AddForeignKey
ALTER TABLE "GroupReviewGate" ADD CONSTRAINT "GroupReviewGate_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
