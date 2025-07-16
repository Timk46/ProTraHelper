-- CreateEnum
CREATE TYPE "PeerReviewStatus" AS ENUM ('CREATED', 'SUBMISSION_OPEN', 'SUBMISSION_CLOSED', 'REVIEW_OPEN', 'REVIEW_CLOSED', 'DISCUSSION_OPEN', 'DISCUSSION_CLOSED', 'COMPLETED');

-- AlterEnum
ALTER TYPE "questionType" ADD VALUE 'MCSlider';

-- AlterTable
ALTER TABLE "Discussion" ADD COLUMN     "peerSubmissionId" TEXT;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "rhinoAutoFocus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rhinoAutoLaunch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rhinoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rhinoGrasshopperFile" TEXT,
ADD COLUMN     "rhinoSettings" JSONB;

-- CreateTable
CREATE TABLE "PeerReviewSession" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "moduleId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "reviewDeadline" TIMESTAMP(3) NOT NULL,
    "discussionDeadline" TIMESTAMP(3) NOT NULL,
    "status" "PeerReviewStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerSubmission" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "fileUploadId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerReview" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "anonymousReviewerId" INTEGER NOT NULL,
    "rating" INTEGER,
    "comment" TEXT,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadQuestion" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "textHTML" TEXT,
    "maxSize" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserUploadAnswer" (
    "id" SERIAL NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "fileId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserUploadAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCSliderQuestion" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB NOT NULL DEFAULT '{}',
    "rhinoIntegration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MCSliderQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PeerReviewSession_moduleId_status_idx" ON "PeerReviewSession"("moduleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PeerSubmission_fileUploadId_key" ON "PeerSubmission"("fileUploadId");

-- CreateIndex
CREATE INDEX "PeerSubmission_sessionId_submittedAt_idx" ON "PeerSubmission"("sessionId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PeerReview_anonymousReviewerId_key" ON "PeerReview"("anonymousReviewerId");

-- CreateIndex
CREATE INDEX "PeerReview_sessionId_reviewerId_idx" ON "PeerReview"("sessionId", "reviewerId");

-- CreateIndex
CREATE INDEX "PeerReview_submissionId_idx" ON "PeerReview"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "PeerReview_sessionId_submissionId_reviewerId_key" ON "PeerReview"("sessionId", "submissionId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "MCSliderQuestion_questionId_key" ON "MCSliderQuestion"("questionId");

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_peerSubmissionId_fkey" FOREIGN KEY ("peerSubmissionId") REFERENCES "PeerSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewSession" ADD CONSTRAINT "PeerReviewSession_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReviewSession" ADD CONSTRAINT "PeerReviewSession_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerSubmission" ADD CONSTRAINT "PeerSubmission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PeerReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerSubmission" ADD CONSTRAINT "PeerSubmission_fileUploadId_fkey" FOREIGN KEY ("fileUploadId") REFERENCES "FileUpload"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PeerReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PeerSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_anonymousReviewerId_fkey" FOREIGN KEY ("anonymousReviewerId") REFERENCES "anonymousUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadQuestion" ADD CONSTRAINT "UploadQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUploadAnswer" ADD CONSTRAINT "UserUploadAnswer_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserUploadAnswer" ADD CONSTRAINT "UserUploadAnswer_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCSliderQuestion" ADD CONSTRAINT "MCSliderQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
