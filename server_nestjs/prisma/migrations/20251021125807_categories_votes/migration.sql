/*
  Warnings:

  - You are about to drop the column `order` on the `evaluation_categories` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `evaluation_categories` table. All the data in the column will be lost.
  - You are about to drop the column `downvotes` on the `evaluation_comments` table. All the data in the column will be lost.
  - You are about to drop the column `upvotes` on the `evaluation_comments` table. All the data in the column will be lost.
  - You are about to drop the column `voteDetails` on the `evaluation_comments` table. All the data in the column will be lost.
  - You are about to drop the `rhino_audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `evaluation_categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "evaluation_categories" DROP CONSTRAINT "evaluation_categories_sessionId_fkey";

-- DropIndex
DROP INDEX "evaluation_categories_sessionId_name_key";

-- AlterTable
ALTER TABLE "GroupReviewGate" ADD COLUMN     "linkedCategories" TEXT;

-- AlterTable
ALTER TABLE "evaluation_categories" DROP COLUMN "order",
DROP COLUMN "sessionId",
ADD COLUMN     "shortDescription" TEXT;

-- AlterTable
ALTER TABLE "evaluation_comments" DROP COLUMN "downvotes",
DROP COLUMN "upvotes",
DROP COLUMN "voteDetails";

-- DropTable
DROP TABLE "rhino_audit_logs";

-- CreateTable
CREATE TABLE "evaluation_session_categories" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluation_session_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationCommentVote" (
    "id" SERIAL NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "voteCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationCommentVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_session_categories_sessionId_categoryId_key" ON "evaluation_session_categories"("sessionId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationCommentVote_commentId_userId_key" ON "EvaluationCommentVote"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_categories_name_key" ON "evaluation_categories"("name");

-- AddForeignKey
ALTER TABLE "evaluation_session_categories" ADD CONSTRAINT "evaluation_session_categories_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "evaluation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_session_categories" ADD CONSTRAINT "evaluation_session_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "evaluation_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCommentVote" ADD CONSTRAINT "EvaluationCommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "evaluation_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCommentVote" ADD CONSTRAINT "EvaluationCommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
