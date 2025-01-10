-- CreateTable
CREATE TABLE "GraphAIFeedback" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prompt" TEXT,
    "response" TEXT NOT NULL,
    "ratingByStudent" INTEGER,
    "userAnswerId" INTEGER NOT NULL,

    CONSTRAINT "GraphAIFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GraphAIFeedback" ADD CONSTRAINT "GraphAIFeedback_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
