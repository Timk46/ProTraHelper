/*
  Warnings:

  - The `evaluationSubmissionId` column on the `Discussion` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `evaluation_comments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `evaluation_comments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `parentId` column on the `evaluation_comments` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `evaluation_submissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `evaluation_submissions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `commentId` on the `EvaluationCommentVote` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `submissionId` on the `evaluation_comments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `submissionId` on the `evaluation_ratings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Discussion" DROP CONSTRAINT "Discussion_evaluationSubmissionId_fkey";

-- DropForeignKey
ALTER TABLE "EvaluationCommentVote" DROP CONSTRAINT "EvaluationCommentVote_commentId_fkey";

-- DropForeignKey
ALTER TABLE "evaluation_comments" DROP CONSTRAINT "evaluation_comments_parentId_fkey";

-- DropForeignKey
ALTER TABLE "evaluation_comments" DROP CONSTRAINT "evaluation_comments_submissionId_fkey";

-- DropForeignKey
ALTER TABLE "evaluation_ratings" DROP CONSTRAINT "evaluation_ratings_submissionId_fkey";

-- AlterTable
ALTER TABLE "Discussion" DROP COLUMN "evaluationSubmissionId",
ADD COLUMN     "evaluationSubmissionId" INTEGER;

-- AlterTable
ALTER TABLE "EvaluationCommentVote" DROP COLUMN "commentId",
ADD COLUMN     "commentId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "evaluation_comments" DROP CONSTRAINT "evaluation_comments_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
DROP COLUMN "submissionId",
ADD COLUMN     "submissionId" INTEGER NOT NULL,
DROP COLUMN "parentId",
ADD COLUMN     "parentId" INTEGER,
ADD CONSTRAINT "evaluation_comments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "evaluation_ratings" DROP COLUMN "submissionId",
ADD COLUMN     "submissionId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "evaluation_submissions" DROP CONSTRAINT "evaluation_submissions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "evaluation_submissions_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationCommentVote_commentId_userId_key" ON "EvaluationCommentVote"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_ratings_submissionId_categoryId_userId_key" ON "evaluation_ratings"("submissionId", "categoryId", "userId");

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_evaluationSubmissionId_fkey" FOREIGN KEY ("evaluationSubmissionId") REFERENCES "evaluation_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_ratings" ADD CONSTRAINT "evaluation_ratings_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "evaluation_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_comments" ADD CONSTRAINT "evaluation_comments_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "evaluation_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_comments" ADD CONSTRAINT "evaluation_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "evaluation_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationCommentVote" ADD CONSTRAINT "EvaluationCommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "evaluation_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
