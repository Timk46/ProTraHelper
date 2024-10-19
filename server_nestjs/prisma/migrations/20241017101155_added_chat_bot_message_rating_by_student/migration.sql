-- AlterTable
ALTER TABLE "ChatBotMessage" ADD COLUMN     "ratingByStudent" INTEGER;

-- AlterTable
ALTER TABLE "UserAnswer" ADD COLUMN     "userGraphAnswer" JSONB;

-- CreateTable
CREATE TABLE "GraphQuestion" (
    "id" SERIAL NOT NULL,
    "textHTML" TEXT,
    "expectations" TEXT NOT NULL,
    "expectationsHTML" TEXT,
    "type" TEXT NOT NULL,
    "initialStructure" JSONB NOT NULL,
    "exampleSolution" JSONB NOT NULL,
    "stepsEnabled" BOOLEAN NOT NULL,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "GraphQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FillinQuestion" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "table" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "FillinQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blank" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "blankContent" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "isDistractor" BOOLEAN NOT NULL DEFAULT false,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "fillinQuestionId" INTEGER NOT NULL,

    CONSTRAINT "Blank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GraphQuestion_questionId_key" ON "GraphQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "FillinQuestion_questionId_key" ON "FillinQuestion"("questionId");

-- AddForeignKey
ALTER TABLE "GraphQuestion" ADD CONSTRAINT "GraphQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FillinQuestion" ADD CONSTRAINT "FillinQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blank" ADD CONSTRAINT "Blank_fillinQuestionId_fkey" FOREIGN KEY ("fillinQuestionId") REFERENCES "FillinQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
