-- CreateTable
CREATE TABLE "CodeGameQuestion" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "programmingLanguage" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "codeSolutionRestriction" BOOLEAN NOT NULL DEFAULT false,
    "fileNameToRestrict" TEXT,
    "methodNameToRestrict" TEXT,
    "frequencyOfMethodNameToRestrict" INTEGER,
    "gameFileName" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "gameCellRestrictions" TEXT,
    "theme" TEXT DEFAULT 'dino',

    CONSTRAINT "CodeGameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeGameScaffold" (
    "id" SERIAL NOT NULL,
    "codeGameQuestionId" INTEGER NOT NULL,
    "codeFileName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT,
    "visible" BOOLEAN,
    "mainFile" BOOLEAN,

    CONSTRAINT "CodeGameScaffold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeGameAnswer" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "codeGameQuestionId" INTEGER NOT NULL,
    "userAnswerId" INTEGER NOT NULL,
    "codeGameExecutionResult" TEXT NOT NULL,
    "codeSolutionRestriction" BOOLEAN NOT NULL,
    "frequencyOfMethodEvaluationResult" BOOLEAN NOT NULL,
    "frequencyOfMethodCallsResult" INTEGER NOT NULL,
    "reachedDestination" BOOLEAN NOT NULL,
    "allRocksCollected" BOOLEAN NOT NULL,
    "totalRocks" INTEGER NOT NULL,
    "collectedRocks" INTEGER NOT NULL,
    "visitedCellsAreAllowed" BOOLEAN NOT NULL,
    "allWhiteListCellsVisited" BOOLEAN NOT NULL,

    CONSTRAINT "CodeGameAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeGameScaffoldAnswer" (
    "id" SERIAL NOT NULL,
    "language" TEXT NOT NULL,
    "codeFileName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "codeGameAnswerId" INTEGER NOT NULL,

    CONSTRAINT "CodeGameScaffoldAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeGameQuestion_questionId_key" ON "CodeGameQuestion"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeGameAnswer_userAnswerId_key" ON "CodeGameAnswer"("userAnswerId");

-- AddForeignKey
ALTER TABLE "CodeGameQuestion" ADD CONSTRAINT "CodeGameQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameScaffold" ADD CONSTRAINT "CodeGameScaffold_codeGameQuestionId_fkey" FOREIGN KEY ("codeGameQuestionId") REFERENCES "CodeGameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameAnswer" ADD CONSTRAINT "CodeGameAnswer_userAnswerId_fkey" FOREIGN KEY ("userAnswerId") REFERENCES "UserAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameScaffoldAnswer" ADD CONSTRAINT "CodeGameScaffoldAnswer_codeGameAnswerId_fkey" FOREIGN KEY ("codeGameAnswerId") REFERENCES "CodeGameAnswer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
