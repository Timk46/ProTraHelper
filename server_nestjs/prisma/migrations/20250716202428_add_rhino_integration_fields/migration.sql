
-- AlterEnum
ALTER TYPE "questionType" ADD VALUE 'MCSlider';


-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "rhinoAutoFocus" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "rhinoAutoLaunch" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rhinoEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rhinoGrasshopperFile" TEXT,
ADD COLUMN     "rhinoSettings" JSONB;

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
CREATE UNIQUE INDEX "MCSliderQuestion_questionId_key" ON "MCSliderQuestion"("questionId");
-- AddForeignKey
ALTER TABLE "MCSliderQuestion" ADD CONSTRAINT "MCSliderQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
