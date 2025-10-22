-- DropForeignKey
ALTER TABLE "evaluation_sessions" DROP CONSTRAINT "evaluation_sessions_groupReviewGateId_fkey";

-- AlterTable
ALTER TABLE "evaluation_sessions" ALTER COLUMN "groupReviewGateId" DROP NOT NULL;
