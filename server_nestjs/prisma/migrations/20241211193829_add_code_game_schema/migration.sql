-- CreateTable
CREATE TABLE "CodeGameQuestion" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "textHTML" TEXT NOT NULL,
    "mainFileName" TEXT NOT NULL,
    "programmingLanguage" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,
    "gameFileName" TEXT NOT NULL,
    "game" TEXT NOT NULL,

    CONSTRAINT "CodeGameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeGameScaffold" (
    "id" SERIAL NOT NULL,
    "codeGameQuestionId" INTEGER NOT NULL,
    "codeFileName" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT,

    CONSTRAINT "CodeGameScaffold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodeGameQuestion_questionId_key" ON "CodeGameQuestion"("questionId");

-- AddForeignKey
ALTER TABLE "CodeGameQuestion" ADD CONSTRAINT "CodeGameQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeGameScaffold" ADD CONSTRAINT "CodeGameScaffold_codeGameQuestionId_fkey" FOREIGN KEY ("codeGameQuestionId") REFERENCES "CodeGameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
