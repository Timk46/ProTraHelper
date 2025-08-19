-- CreateTable
CREATE TABLE "evaluation_comments" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "voteDetails" JSONB,
    "anonymousDisplayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_comments_pkey" PRIMARY KEY ("id")
);

-- AddColumn to evaluation_submissions
ALTER TABLE "evaluation_submissions" ADD COLUMN "phase" "EvaluationPhase" NOT NULL DEFAULT 'DISCUSSION';

-- AddForeignKey
ALTER TABLE "evaluation_comments" ADD CONSTRAINT "evaluation_comments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "evaluation_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_comments" ADD CONSTRAINT "evaluation_comments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "evaluation_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_comments" ADD CONSTRAINT "evaluation_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;