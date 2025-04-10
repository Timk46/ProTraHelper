-- CreateTable
CREATE TABLE "GeneratedFeedback" (
    "id" TEXT NOT NULL,
    "spsContent" TEXT NOT NULL,
    "kmContent" TEXT NOT NULL,
    "kcContent" TEXT NOT NULL,
    "khContent" TEXT NOT NULL,
    "spsUsedAt" TIMESTAMP(3),
    "kmUsedAt" TIMESTAMP(3),
    "kcUsedAt" TIMESTAMP(3),
    "khUsedAt" TIMESTAMP(3),
    "finalPrompt" TEXT NOT NULL,
    "codeSubmissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GeneratedFeedback_codeSubmissionId_idx" ON "GeneratedFeedback"("codeSubmissionId");

-- AddForeignKey
ALTER TABLE "GeneratedFeedback" ADD CONSTRAINT "GeneratedFeedback_codeSubmissionId_fkey" FOREIGN KEY ("codeSubmissionId") REFERENCES "CodeSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
